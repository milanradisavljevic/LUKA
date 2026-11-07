/// <reference types="vite/client" />

/** Git-Kurz-Hash zur Build-Zeit (leer, wenn git fehlt). */
declare const __GIT_COMMIT__: string;

/** Changelog-Abschnitt für die tatsächlich gebaute Version. */
declare const __INSTALLED_RELEASE_NOTES__: string;
