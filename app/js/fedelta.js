/*
 * Fedeltà del trattamento (treatment integrity): quanto le conseguenze
 * registrate in seduta corrispondono a quelle programmate nella fase.
 *
 * Si conta per opportunità, cioè ogni occasione in cui il piano chiedeva di
 * dare o di non dare una conseguenza (Vollmer, Sloman & St. Peter Pipkin,
 * 2008). Gli errori sono di due tipi (St. Peter Pipkin, Vollmer & Sloman,
 * 2010):
 *   omissione: la conseguenza era dovuta e non è stata segnata;
 *   commissione: una conseguenza data quando non era dovuta, compreso il
 *     comportamento problema rinforzato durante l'estinzione.
 * Percentuale = opportunità corrette / opportunità × 100.
 *
 * Il calcolo usa solo gli eventi del telefono, quindi vale per le procedure
 * in cui le consegne dovute si ricavano dai dati: rinforzo continuo o a
 * rapporto fisso di risposte contate, DRO, DRL, estinzione, schema multiplo.
 * Le altre (schemi a intervallo o variabili, DRH, procedure restrittive)
 * restano "non calcolabili" e richiedono un osservatore con una checklist.
 * Vedi docs/piano-intervento.md.
 */
(function (root) {
  'use strict';

  var M = root.BR && root.BR.modello ? root.BR.modello : require('./modello.js');
  var P = root.BR && root.BR.piano ? root.BR.piano : require('./piano.js');

  // Soglia sotto la quale il desktop segnala la seduta. È una convenzione del
  // software, non un valore stabilito dalla letteratura: va adattata al caso.
  var SOGLIA = 80;

  function eConseguenza(e, c, azione) {
    return e.tipo === 'conseguenza' && e.valore && e.valore.contingenzaId === c.id && (!azione || e.valore.azione === azione);
  }

  /*
   * Risposte che guadagnano il rinforzo, per i target che le contano una per
   * una: occorrenze (frequenza, IRT), risposte (latenza), prove corrette
   * (DTT, con qualsiasi prompt). Per le altre misure restituisce null.
   */
  function risposte(target, ev) {
    if (!target) return null;
    switch (target.metodo.tipo) {
      case 'frequenza': case 'irt':
        return ev.filter(function (e) { return e.targetId === target.id && e.tipo === 'occorrenza'; });
      case 'latenza':
        return ev.filter(function (e) { return e.targetId === target.id && e.tipo === 'risposta'; });
      case 'dtt':
        return ev.filter(function (e) { return e.targetId === target.id && e.tipo === 'prova' && e.valore && e.valore.esito !== 'errore'; });
      default:
        return null;
    }
  }

  // Consegne dovute per un numero di risposte, se lo schema lo permette.
  function dovutePer(schema, n) {
    var tipo = schema && schema.tipo;
    if (tipo === 'CRF') return n;
    if (tipo === 'FR' && +schema.valore > 0) return Math.floor(n / +schema.valore);
    return null;
  }

  function riga(c, conti, nota) {
    var r = { contingenza: c, sigla: P.siglaContingenza(c), valutabile: !!conti, nota: nota || '' };
    if (!conti) return r;
    r.corrette = Math.max(0, conti.corrette);
    r.omissioni = Math.max(0, conti.omissioni || 0);
    r.commissioni = Math.max(0, conti.commissioni || 0);
    r.opportunita = r.corrette + r.omissioni + r.commissioni;
    r.percentuale = r.opportunita ? (r.corrette / r.opportunita) * 100 : null;
    return r;
  }

  function somma(a, b) {
    return {
      corrette: a.corrette + b.corrette,
      omissioni: (a.omissioni || 0) + (b.omissioni || 0),
      commissioni: (a.commissioni || 0) + (b.commissioni || 0)
    };
  }

  // Confronto tra consegne dovute e segnate: in più sono commissioni, in meno
  // omissioni.
  function confronta(dovute, date) {
    return { corrette: Math.min(dovute, date), omissioni: Math.max(dovute - date, 0), commissioni: Math.max(date - dovute, 0) };
  }

  /*
   * Rinforzo contingente alle risposte di un target (rinforzo positivo o
   * negativo, token, alternativa di FCT/DRA/DRI). Con lo schema multiplo le
   * risposte in SD vanno rinforzate secondo lo schema; in SΔ no, e una
   * consegna in SΔ è una commissione.
   */
  function rinforzoContingente(c, target, schema, ev, consegne) {
    var risp = risposte(target, ev);
    if (!risp) return { nota: 'La misura di “' + (target ? target.nome : '?') + '” non conta le singole risposte.' };
    if (schema && schema.segnalato) {
      var inSd = function (e) { return P.componenteMultiplo(c, ev, e.t) !== 'sdelta'; };
      var rSd = risp.filter(inSd), rSdelta = risp.length - rSd.length;
      var cSd = consegne.filter(inSd), cSdelta = consegne.length - cSd.length;
      var dov = dovutePer(schema, rSd.length);
      if (dov == null) return { nota: 'Schema ' + P.descriviSchema(schema) + ': le consegne dovute non si ricavano dagli eventi.' };
      var base = confronta(dov, cSd.length);
      // Ogni risposta in SΔ è un'occasione di non rinforzare.
      var trattenute = Math.max(rSdelta - cSdelta, 0);
      return { conti: { corrette: base.corrette + trattenute, omissioni: base.omissioni, commissioni: base.commissioni + cSdelta } };
    }
    var dovute = dovutePer(schema, risp.length);
    if (dovute == null) return { nota: 'Schema ' + P.descriviSchema(schema) + ': le consegne dovute non si ricavano dagli eventi.' };
    return { conti: confronta(dovute, consegne.length) };
  }

  // Estinzione: ogni occorrenza del problema è un'occasione di non
  // rinforzarlo; "rinforzato per errore" è una commissione.
  function estinzione(problemaId, ev, errori) {
    var occ = ev.filter(function (e) { return e.targetId === problemaId && P.eventoComportamento(e); }).length;
    return { corrette: Math.max(occ - errori, 0), commissioni: errori };
  }

  // Divide gli eventi di una conseguenza a timer in tratti avvio → ferma.
  function tratti(c, ev, fine) {
    var out = [], corrente = null;
    ev.forEach(function (e) {
      if (!eConseguenza(e, c)) return;
      if (e.valore.azione === 'avvio') {
        if (corrente) corrente.fine = e.t;
        corrente = { inizio: e.t, fine: fine };
        out.push(corrente);
      } else if (e.valore.azione === 'ferma' && corrente) {
        corrente.fine = e.t;
        corrente = null;
      }
    });
    return out.map(function (x) {
      return { fine: x.fine, eventi: ev.filter(function (e) { return e.t >= x.inizio && e.t < x.fine; }) };
    });
  }

  function dro(c, ev, fine) {
    var tot = { corrette: 0, omissioni: 0, commissioni: 0 };
    var evT = ev.filter(function (e) { return e.targetId === c.targetId || eConseguenza(e, c); });
    tratti(c, evT, fine).forEach(function (x) {
      var st = P.statoDro(c, x.eventi, x.fine);
      if (!st.attivo) return;
      if (st.momentaneo) {
        // Ogni controllo concluso va segnato (presente o assente).
        var mancanti = st.saltati + (st.domanda != null ? 1 : 0);
        tot = somma(tot, { corrette: Math.max(st.indice - mancanti, 0), omissioni: mancanti });
      } else {
        tot = somma(tot, { corrette: st.rinforzi, omissioni: st.mancati + (st.dovuto ? 1 : 0) });
      }
    });
    return tot;
  }

  function drl(c, ev, fine) {
    var evT = ev.filter(function (e) { return e.targetId === c.targetId || eConseguenza(e, c); });
    var p = c.parametri || {};
    if (!p.variante || p.variante === 'sessione') {
      var st = P.statoDrl(c, evT, fine);
      // Una sola occasione: a fine seduta, rinforzo se entro il limite.
      var dato = st.rinforzi + evT.filter(function (e) { return eConseguenza(e, c, 'data'); }).length > 0;
      if (st.entro) return dato ? { corrette: 1 } : { corrette: 0, omissioni: 1 };
      return dato ? { corrette: 0, commissioni: 1 } : { corrette: 1 };
    }
    var tot = { corrette: 0, omissioni: 0, commissioni: 0 };
    tratti(c, evT, fine).forEach(function (x) {
      var s = P.statoDrl(c, x.eventi, x.fine);
      if (!s.attivo) return;
      if (s.variante === 'intervalli') {
        // Intervalli conclusi: rinforzati se entro il limite, non rinforzati se oltre.
        tot = somma(tot, { corrette: s.segnati + s.persi, omissioni: s.dovuti - s.segnati });
      } else {
        tot = somma(tot, { corrette: s.qualificate - s.mancati - (s.dovuto ? 1 : 0), omissioni: s.mancati + (s.dovuto ? 1 : 0) });
      }
    });
    return tot;
  }

  /*
   * Fedeltà di una seduta per un programma.
   * fase: la fase pianificata della seduta (o null); targets: i target del
   * programma; eventi: tutti gli eventi della seduta (anche annullati: si
   * filtrano qui); sessione: { inizio, fine }.
   * Restituisce { righe, opportunita, corrette, omissioni, commissioni,
   * percentuale } con percentuale null se nessuna riga è calcolabile.
   */
  function seduta(fase, targets, eventi, sessione) {
    // Nei blocchi di probe il rinforzo differenziale non si dà: quelle
    // risposte non sono occasioni per le conseguenze del piano.
    var ev = M.eventiValidi(eventi).filter(function (e) { return e.contesto !== 'probe'; });
    var fine = sessione.fine != null ? sessione.fine : (ev.length ? ev[ev.length - 1].t : sessione.inizio);
    var perId = {};
    (targets || []).forEach(function (t) { perId[t.id] = t; });
    var contingenze = (fase && fase.contingenze) || [];
    var conEstinzione = {};
    contingenze.forEach(function (c) { if (c.procedura === 'estinzione') conEstinzione[c.targetId] = true; });

    var righe = contingenze.map(function (c) {
      var p = c.parametri || {};
      var consegne = ev.filter(function (e) { return eConseguenza(e, c, 'data'); });
      var errori = ev.filter(function (e) { return eConseguenza(e, c, 'errore'); }).length;
      switch (c.procedura) {
        case 'rinforzo_positivo': case 'rinforzo_negativo': case 'token': {
          var r = rinforzoContingente(c, perId[c.targetId], c.schema, ev, consegne);
          return riga(c, r.conti, r.nota);
        }
        case 'fct': case 'dra': case 'dri': {
          // Alternativa: consegne segnate sulla sua scheda (o senza target).
          var problema = c.targetId, alt = p.alternativoId;
          var perAlt = consegne.filter(function (e) { return e.targetId !== problema || !alt; });
          var ra = rinforzoContingente(c, perId[alt], c.schema, ev, perAlt);
          if (!ra.conti) return riga(c, null, ra.nota);
          var conti = ra.conti;
          if (p.problema === 'rinforzo') {
            // Schemi concorrenti: anche il problema ha il suo schema.
            var perProb = consegne.filter(function (e) { return e.targetId === problema && alt; });
            var rp = rinforzoContingente({ id: c.id, schema: p.schemaProblema }, perId[problema], p.schemaProblema, ev, perProb);
            if (!rp.conti) return riga(c, conti, 'Solo l’alternativa: ' + rp.nota.charAt(0).toLowerCase() + rp.nota.slice(1));
            conti = somma(conti, rp.conti);
          } else if (!conEstinzione[problema]) {
            conti = somma(conti, estinzione(problema, ev, errori));
          }
          return riga(c, conti);
        }
        case 'estinzione':
          return riga(c, estinzione(c.targetId, ev, errori));
        case 'dro':
          return riga(c, dro(c, ev, fine));
        case 'drl':
          return riga(c, drl(c, ev, fine));
        default:
          return riga(c, null, 'Non si ricava dagli eventi: serve un osservatore con una checklist.');
      }
    });

    var tot = { corrette: 0, omissioni: 0, commissioni: 0 };
    righe.forEach(function (r) { if (r.valutabile) tot = somma(tot, r); });
    var opp = tot.corrette + tot.omissioni + tot.commissioni;
    return {
      righe: righe,
      opportunita: opp,
      corrette: tot.corrette,
      omissioni: tot.omissioni,
      commissioni: tot.commissioni,
      percentuale: opp ? (tot.corrette / opp) * 100 : null
    };
  }

  /*
   * Fedeltà per ogni seduta chiusa di un programma, in ordine cronologico.
   * opzioni.soloSincronizzate come in archivio.serie.
   */
  function serie(stato, sog, programma, opzioni) {
    var A = root.BR.archivio;
    var o = opzioni || {};
    return A.sessioniDi(stato, sog.id, { soloChiuse: true, soloSincronizzate: o.soloSincronizzate }).map(function (s) {
      var voce = A.voceDiSessione(programma, s);
      var fase = voce && voce.pianoId ? P.fasePianificata(programma, voce.pianoId) : null;
      if (!fase || !(fase.contingenze || []).length) return null;
      var r = seduta(fase, programma.target, A.eventiDi(stato, s.id), s);
      if (r.percentuale == null) return null;
      r.sessione = s;
      r.faseNome = P.nomeFase(programma, voce);
      return r;
    }).filter(Boolean);
  }

  function formatta(x) { return x == null ? '–' : Math.round(x) + '%'; }

  // Errori di una riga o di una seduta, in parole.
  function descriviErrori(r) {
    var parti = [];
    if (r.omissioni) parti.push(r.omissioni + (r.omissioni === 1 ? ' omissione' : ' omissioni'));
    if (r.commissioni) parti.push(r.commissioni + (r.commissioni === 1 ? ' commissione' : ' commissioni'));
    return parti.length ? parti.join(', ') : 'nessun errore';
  }

  var api = { SOGLIA: SOGLIA, seduta: seduta, serie: serie, formatta: formatta, descriviErrori: descriviErrori };
  root.BR = root.BR || {};
  root.BR.fedelta = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
