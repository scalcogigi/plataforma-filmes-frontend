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
SDK = """window.authEvents=[];
const realFetch=window.fetch;
window.fetch=(...args)=>{window.authEvents.push('fetch:'+args[0]);return realFetch(...args)};
window.auth0={Auth0Client:class {
 constructor(){window.authEvents.push('constructor')}
 async checkSession(){
   window.authEvents.push('checkSession');
   if(window.restorePending) await new Promise(resolve=>window.resumeSession=resolve);
   if(window.restoreError) throw Object.assign(new Error(window.restoreError),{error:window.restoreError});
 }
 async handleRedirectCallback(){window.authEvents.push('callback');window.callbackDone=true;return {appState:{returnTo:'/'}}}
 async isAuthenticated(){return SIGNED_IN && (!window.requireCallback || window.callbackDone)}
 async getUser(){window.authEvents.push('getUser');return {sub:'auth0|test',name:'Ana',email:'ana@example.invalid'}}
 async getTokenSilently(){
   window.authEvents.push('getToken');
   if(window.blockToken){await new Promise(resolve=>window.releaseToken=resolve);window.blockToken=false}
   if(window.failToken) throw new Error('login_required');
   return window.emptyToken ? '' : 'test-token';
 }
 async logout(){window.logoutCalls=(window.logoutCalls||0)+1}
 async loginWithRedirect(){window.loginCalls=(window.loginCalls||0)+1}
}};"""


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
        self.auth_headers = []
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
            self.auth_headers.append(route.request.headers.get("authorization"))
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

    def test_silent_error_does_not_block_interactive_login(self):
        self.page.add_init_script("window.restoreError='access_denied'")
        self.open()
        self.assertEqual(self.calls, [])
        self.assertFalse(self.page.evaluate('Auth.isAuthenticated()'))
        self.assertTrue(self.page.locator('.auth-gate').is_visible())
        self.page.locator('[data-auth-login]').click()
        self.assertEqual(self.page.evaluate('window.loginCalls'), 1)

    def test_login_required_keeps_guest_browsing_and_login_available(self):
        self.page.add_init_script("window.restoreError='login_required'")
        self.open()
        self.assertEqual(self.calls, [])
        self.assertFalse(self.page.locator('.auth-gate').is_visible())
        self.page.locator('.user-chip').click()
        self.page.locator('[data-action="login"]').click()
        self.assertEqual(self.page.evaluate('window.loginCalls'), 1)

    def test_login_is_available_while_silent_restoration_is_pending(self):
        self.page.add_init_script('window.restorePending=true')
        self.open()
        self.page.wait_for_function('!!window.resumeSession')
        self.assertEqual(self.calls, [])
        self.page.locator('.user-chip').click()
        self.page.locator('[data-action="login"]').click()
        self.assertEqual(self.page.evaluate('window.loginCalls'), 1)

    def test_callback_precedes_profile_queries_without_silent_restoration(self):
        self.page.add_init_script('window.requireCallback=true')
        self.page.goto(self.base+'/?code=test-code&state=test-state', wait_until='networkidle')
        self.page.wait_for_function('Auth.isAuthenticated()')
        events = self.page.evaluate('window.authEvents')
        self.assertNotIn('checkSession', events)
        first_profile = events.index('fetch:http://localhost:8080/users/me')
        self.assertLess(events.index('callback'), events.index('getUser'))
        self.assertLess(events.index('getUser'), events.index('getToken'))
        self.assertLess(events.index('getToken'), first_profile)
        self.assertTrue(self.auth_headers)
        self.assertTrue(all(header == 'Bearer test-token' for header in self.auth_headers))
        self.assertNotIn('code=', self.page.url)

    def test_profile_waits_for_access_token(self):
        self.page.add_init_script('window.blockToken=true')
        self.open()
        self.page.wait_for_function('!!window.releaseToken')
        self.assertEqual(self.calls, [])
        self.page.evaluate('window.releaseToken()')
        self.page.wait_for_function('Auth.isAuthenticated()')
        self.assertIn(('GET','/users/me'), self.calls)

    def test_empty_access_token_never_reaches_api(self):
        self.page.add_init_script('window.emptyToken=true')
        self.open()
        self.assertEqual(self.calls, [])
        self.assertFalse(self.page.evaluate('Auth.isAuthenticated()'))
        self.assertTrue(self.page.locator('.auth-gate').is_visible())

if __name__ == '__main__': unittest.main(verbosity=2)
