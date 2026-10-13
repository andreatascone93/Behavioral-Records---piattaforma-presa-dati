/*
 * Impostazioni di pubblicazione. Per collegare tutti i dispositivi allo
 * stesso cloud senza dover digitare indirizzo e chiave, inserirli qui
 * (Supabase → Project Settings → API). La chiave "anon" è pubblica per
 * natura: i dati sono protetti dalle regole del database e dall'accesso
 * di ogni operatore. Lasciati vuoti, l'app chiede i dati nel pannello Cloud.
 */
window.BR_CONFIG = {
  supabase: {
    url: '',
    chiave: ''
  }
};
