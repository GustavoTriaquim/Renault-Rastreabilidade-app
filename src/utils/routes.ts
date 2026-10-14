import type { Href } from 'expo-router';

/**
 * Rotas dinâmicas montadas em um só lugar. Os tipos de rota do Expo Router só são
 * regenerados com o servidor em execução; centralizar aqui evita erros de TypeScript
 * quando uma rota nova ainda não consta nos tipos gerados.
 */
export const partHref = (partId: string) => `/part/${partId}` as Href;
export const notificationHref = (notificationId: string) => `/notification/${notificationId}` as Href;
export const dossierHref = (partId: string) => `/dossier/${partId}` as Href;

/** Abas (o grupo `(tabs)` não aparece na URL). */
export const scannerHref = () => '/scanner' as Href;
export const historyHref = () => '/history' as Href;
export const notificationsHref = () => '/notifications' as Href;
