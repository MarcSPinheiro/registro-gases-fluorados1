// Service Worker para Registo de Gases Fluorados
const CACHE_NAME = 'gases-fluorados-v1.2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/styles.css',
  '/app.js'
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
                // Adiciona apenas URLs importantes ao cache
                const url = new URL(event.request.url);
                if (url.origin === location.origin && 
                    (url.pathname === '/' || 
                     url.pathname === '/index.html' ||
                     url.pathname.includes('.css') ||
                     url.pathname.includes('.js'))) {
                  cache.put(event.request, responseToCache);
                  console.log('Service Worker: Cache atualizado para:', event.request.url);
                }
              });

            return networkResponse;
          })
          .catch(error => {
            console.error('Service Worker: Erro na requisição:', error);
            
            // Fallback para páginas offline
            if (event.request.destination === 'document') {
              return caches.match('/index.html');
            }
            
            // Fallback genérico
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

// Sincronização em background (quando online novamente)
self.addEventListener('sync', event => {
  if (event.tag === 'background-sync') {
    console.log('Service Worker: Sincronização em background');
    event.waitUntil(doBackgroundSync());
  }
});

// Notificações push
self.addEventListener('push', event => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'Nova notificação do sistema',
    icon: '/icon-192.png',
    badge: '/icon-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      {
        action: 'view',
        title: 'Ver'
      },
      {
        action: 'close',
        title: 'Fechar'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'Registo Gases Fluorados', options)
  );
});

// Clique em notificações
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(windowClients => {
        // Foca na janela existente se disponível
        for (let client of windowClients) {
          if (client.url === '/' && 'focus' in client) {
            return client.focus();
          }
        }
        // Abre nova janela se não existir
        if (clients.openWindow) {
          return clients.openWindow('/');
        }
      })
    );
  }
});

// Função de sincronização em background
function doBackgroundSync() {
  return new Promise((resolve, reject) => {
    // Aqui você pode adicionar lógica para sincronizar dados
    // quando o dispositivo voltar a ficar online
    console.log('Service Worker: Executando sincronização em background');
    
    // Simula uma sincronização
    setTimeout(() => {
      console.log('Service Worker: Sincronização concluída');
      resolve();
    }, 1000);
  });
}

// Gerenciamento de cache para APIs
function handleApiRequest(request) {
  return fetch(request)
    .then(response => {
      // Para APIs, não fazemos cache por padrão
      // mas você pode personalizar conforme necessidade
      return response;
    })
    .catch(error => {
      console.error('Service Worker: Erro na API:', error);
      return new Response(JSON.stringify({
        error: 'Offline',
        message: 'Não foi possível conectar ao servidor'
      }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      });
    });
}
