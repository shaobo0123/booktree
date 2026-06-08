import { createRouter, createWebHistory } from 'vue-router';

export const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', name: 'root', props: { folderId: null }, component: { template: '<div />' } },
    { path: '/folder/:id/:title?', name: 'folder', props: true, component: { template: '<div />' } },
    { path: '/admin', name: 'admin', component: { template: '<div />' } }
  ]
});
