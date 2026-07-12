export const NK_GROUP = 'nk';
export const USERS_COLLECTION = 'allowedUsers';
export const RESOURCES_COLLECTION = 'resources';
export const TYPE_PDF = "pdf";
export const TYPE_EPUB = "epub";

// How much of a PDF to feed the summariser. Enough pages to get past title
// pages, copyright and contents into actual prose, then a character cap so a
// dense page can't blow out the prompt.
export const PDF_SUMMARY_PAGES = 10;
export const PDF_SUMMARY_CHAR_LIMIT = 12000;