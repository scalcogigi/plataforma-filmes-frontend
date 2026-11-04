"""Isolated browser regressions. No real Auth0 account or API required."""
from copy import deepcopy
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import json
import os
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
PROFILE = {"id": "u1", "auth0UserId": "auth0|test", "username": "ana", "displayName": "Ana", "email": "ana@example.invalid", "filmesFavoritosIds": [], "filmesAssistidosIds": [], "seguindoIds": [], "seguidoresIds": [], "createdAt": "2026-01-01T00:00:00Z", "updateAt": "2026-01-01T00:00:00Z"}
FILM = {"id": 42, "nome": "Interestelar", "diretor": "Christopher Nolan", "genero": "Ficção científica", "lancamento": "2014-11-06", "tipo": "filme", "avaliacao": 8.7, "trailerUrl": "https://www.youtube.com/watch?v=AAAAAAAAAAA"}
SDK = """window.auth0={createAuth0Client:async()=>({
 isAuthenticated:async()=>SIGNED_IN,
 getUser:async()=>({sub:'auth0|test',name:'Ana',email:'ana@example.invalid'}),
 getTokenSilently:async()=>{if(window.failToken) throw new Error('login_required'); return 'test-token'},
 logout:async()=>{window.logoutCalls=(window.logoutCalls||0)+1},
 loginWithRedirect:async()=>{}
})};"""

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_): pass

class BrowserRegressions(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), partial(QuietHandler, directory=str(ROOT)))
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()
        cls.base = f'http://127.0.0.1:{cls.server.server_port}'
        cls.playwright = sync_playwright().start()
        options = {'headless': True}
        if os.environ.get('CHROME_PATH'): options['executable_path'] = os.environ['CHROME_PATH']
        cls.browser = cls.playwright.chromium.launch(**options)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.playwright.stop()
        cls.server.shutdown(); cls.server.server_close(); cls.thread.join()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 1280, 'height': 900})
        self.page = self.context.new_page()
        self.profile = deepcopy(PROFILE)
        self.profile_status = 200
        self.catalog_status = 200
        self.signed_in = True
        self.calls = []
        self.errors = []
        self.page.on('pageerror', lambda error: self.errors.append(str(error)))
        self.context.route('**/*', self.route)

    def tearDown(self):
        self.context.close()
        self.assertEqual(self.errors, [])

    def route(self, route):
        url = route.request.url
        if 'cdn.auth0.com/' in url:
            return route.fulfill(content_type='application/javascript', body=SDK.replace('SIGNED_IN', 'true' if self.signed_in else 'false'))
        if 'fonts.googleapis.com' in url or 'fonts.gstatic.com' in url or 'youtube-nocookie.com' in url:
            return route.fulfill(body='')
        if url.startswith('http://localhost:8080'):
            path = url.removeprefix('http://localhost:8080')
            self.calls.append((route.request.method, path))
            if path == '/users/me' and self.profile_status != 200:
                return route.fulfill(status=self.profile_status, body='')
            if path.startswith('/users/me/favorites/') or path.startswith('/users/me/watched/'):
                field = 'filmesFavoritosIds' if '/favorites/' in path else 'filmesAssistidosIds'
                movie_id = path.rsplit('/', 1)[1]
                if route.request.method == 'PUT' and movie_id not in self.profile[field]: self.profile[field].append(movie_id)
                if route.request.method == 'DELETE': self.profile[field] = [i for i in self.profile[field] if i != movie_id]
            body = [dict(self.profile, email=None, auth0UserId=None)] if path == '/users' else self.profile
            return route.fulfill(content_type='application/json', body=json.dumps(body))
        if url.startswith('http://localhost:8081'):
            path = url.removeprefix('http://localhost:8081')
            if path == '/filmes':
                return route.fulfill(status=self.catalog_status, content_type='application/json', body=json.dumps([FILM]) if self.catalog_status == 200 else '{"message":"Serviço indisponível"}')
            return route.fulfill(content_type='application/json', body='[]')
        return route.continue_()

    def open(self):
        self.page.goto(self.base, wait_until='networkidle')

    def test_profile_error_is_visible_and_retry_recovers(self):
        self.profile_status = 401
        self.open()
        self.assertTrue(self.page.locator('.auth-gate').is_visible())
        self.assertFalse(self.page.evaluate('Auth.isAuthenticated()'))
        self.profile_status = 200
        self.page.locator('[data-auth-retry]').click()
        self.page.wait_for_function('Auth.isAuthenticated()')
        self.assertFalse(self.page.locator('.auth-gate').is_visible())
        self.assertEqual(self.page.evaluate('Catalog.getUser("u1").user.email'), PROFILE['email'])

    def test_favorites_watched_and_logout(self):
        self.open()
        self.page.wait_for_function('Auth.isAuthenticated()')
        self.page.locator('#screen [data-action="open-movie"]').first.click()
        favorite = self.page.locator('[data-action="toggle-favorite"]')
        favorite.click()
        self.page.wait_for_function('Catalog.me().favoritos.includes("42")')
        self.page.locator('[data-action="toggle-watched"]').click()
        self.page.wait_for_function('Catalog.me().assistidos.includes("42")')
        favorite.click()
        self.page.wait_for_function('!Catalog.me().favoritos.includes("42")')
        self.assertIn(('PUT', '/users/me/favorites/42'), self.calls)
        self.assertIn(('DELETE', '/users/me/favorites/42'), self.calls)
        self.page.locator('.user-chip').click()
        self.page.locator('[data-action="logout"]').click()
        self.assertEqual(self.page.evaluate('window.logoutCalls'), 1)

    def test_search_matches_director_genre_and_accents(self):
        self.open()
        self.page.wait_for_function('Auth.isAuthenticated()')
        for query in ['Nolan', 'cientifica', 'terest']:
            self.page.locator('#search').fill(query)
            self.assertEqual(self.page.locator('#screen [data-action="open-movie"]').count(), 1)

    def test_catalog_error_and_retry(self):
        self.signed_in = False
        self.catalog_status = 503
        self.open()
        self.assertTrue(self.page.locator('#screen [role="alert"]').is_visible())
        self.catalog_status = 200
        self.page.locator('[data-action="retry-catalog"]').click()
        self.page.wait_for_selector('#screen [data-action="open-movie"]')
        self.assertEqual(self.page.locator('#screen [role="alert"]').count(), 0)

    def test_expired_token_requires_recovery(self):
        self.open()
        self.page.wait_for_function('Auth.isAuthenticated()')
        self.page.evaluate('window.failToken=true')
        self.page.evaluate('Api.users("/users/me").catch(()=>{})')
        self.assertTrue(self.page.locator('.auth-gate').is_visible())
        self.assertFalse(self.page.evaluate('Auth.isAuthenticated()'))

    def test_player_embeds_trailer_and_stops_on_close(self):
        self.open()
        self.page.locator('.sidebar [data-nav="comunidade"]').click()
        self.page.locator('[data-action="play"]').first.click()
        self.assertEqual(self.page.locator('#player iframe').count(), 1)
        self.assertIn('/embed/AAAAAAAAAAA', self.page.locator('#player iframe').get_attribute('src'))
        self.page.locator('[data-action="close-player"]').click()
        self.page.wait_for_function('!document.querySelector("#player iframe")')

if __name__ == '__main__': unittest.main(verbosity=2)
