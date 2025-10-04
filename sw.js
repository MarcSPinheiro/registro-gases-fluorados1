// Service Worker para Registo de Gases Fluorados
const CACHE_NAME = 'gases-fluorados-v1.3';
const urlsToCache = [
  './',
  './index.html'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Service Worker: Caching arquivos');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Instalado com sucesso');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Erro no cache', error);
      })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', event => {
  console.log('Service Worker: Ativando...');
  
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cache => {
          if (cache !== CACHE_NAME) {
            console.log('Service Worker: Limpando cache antigo', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ativado com sucesso');
      return self.clients.claim();
    })
  );
});

// Interceptação de requisições
self.addEventListener('fetch', event => {
  // Ignora requisições não GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Retorna do cache se disponível
        if (response) {
          console.log('Service Worker: Retornando do cache:', event.request.url);
          return response;
        }

        // Faz requisição à rede
        return fetch(event.request)
          .then(networkResponse => {
            // Verifica se a resposta é válida
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clona a resposta para adicionar ao cache
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
                console.log('Service Worker: Cache atualizado para:', event.request.url);
              });

            return networkResponse;
          })
          .catch(error => {
            console.error('Service Worker: Erro na requisição:', error);
            
            // Fallback para páginas offline
            if (event.request.destination === 'document') {
              return caches.match('./index.html');
            }
            
            return new Response('Modo offline - Aplicação não disponível', {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'text/plain'
              })
            });
          });
      })
  );
});

// Mensagens do Service Worker
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
