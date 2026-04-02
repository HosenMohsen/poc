const board = document.getElementById("board");
const trelloOrgId = '69cd1c868a86ca3c906da76c';
const trelloKey = '8efbd4c4bbce7a6d33b89689c949b233';
const trelloToken = 'ATTA77272e81365c3f57bb6bb77356b882d9a9f451532904f647987bea5f0945c28dE2BF7FE5';

const createTrelloBoardOptions = async () => {
  const trelloURL = `https://api.trello.com/1/organizations/${trelloOrgId}/boards?key=${trelloKey}&token=${trelloToken}&fields=id,name,url`;

  const trelloResponse = await fetch(trelloURL);

  if (!trelloResponse.ok) {
    throw new Error(`Trello API error: ${trelloResponse.status}`);
  }

  const data = await trelloResponse.json();


  data.forEach(element => {
    const option = document.createElement('option');
    option.value = element.id;
    option.textContent = element.name;
    board.appendChild(option);
  });
}

const fetchN8NData = async (group) => {
  const n8nWHLink = "https://dancodeur.app.n8n.cloud/webhook/653d0586-27cc-43dd-93ac-53757e262fed";

  const n8nResponse = await fetch(n8nWHLink, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(group)
  })

  const n8nRaw = await n8nResponse.json();
  console.log('n8nRaw full response:', n8nRaw);

  let raw = n8nRaw.data ?? n8nRaw;
  if (typeof raw === 'string') {
    try { raw = JSON.parse(raw); } catch (_) { /* c'est déjà du texte brut */ }
  }

  if (Array.isArray(raw)) raw = raw[0];

  const toValues = (v) => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map((item, i) => `${i + 1}. ${toValues(item)}`).join('\n');
    if (v && typeof v === 'object') return Object.values(v).map(val => toValues(val)).join('\n');
    return String(v);
  };

  const toText = (v) => {
    if (typeof v === 'string') return v;
    if (Array.isArray(v)) return v.map((item, i) => `${i + 1}. ${toText(item)}`).join('\n');
    if (v && typeof v === 'object') {
      return Object.entries(v).map(([k, val]) => `${k} : ${toText(val)}`).join('\n');
    }
    return String(v);
  };

  if (raw && typeof raw === 'object') {
    const parts = [];
    if (raw.resume)                 parts.push('Résumé :\n' + toValues(raw.resume));
    if (raw.questions_orientations) parts.push('Questions d\'orientation :\n' + toValues(raw.questions_orientations));
    if (raw.questions)              parts.push('Questions :\n' + toValues(raw.questions));
    if (parts.length === 0) {
      Object.entries(raw).forEach(([k, v]) => {
        parts.push(`${k} :\n${toValues(v)}`);
      });
    }
    return parts.join('\n\n');
  }

  return String(raw);
}


createTrelloBoardOptions();

const form = document.getElementById('trelloForm')

form.addEventListener('submit', async (e) => {
  let timeline = document.getElementById('timeline');
  timeline.innerHTML = '';
  e.preventDefault();
  const boardForm = new FormData(form);
  const boardFormValue = boardForm.get('trello-boards');
  const trelloListsURL = `https://api.trello.com/1/boards/${boardFormValue}/lists?key=${trelloKey}&token=${trelloToken}`;
  const trelloCardsURL = `https://api.trello.com/1/boards/${boardFormValue}/cards?key=${trelloKey}&token=${trelloToken}&fields=name,desc,idList`;


  const [listsResponse, cardsResponse] = await Promise.all([fetch(trelloListsURL), fetch(trelloCardsURL)]);

  const listsData = await listsResponse.json();
  let cardsData = await cardsResponse.json();
  cardsData = cardsData.map(card => ({
    ...card,
    createdAt: trelloIdToDate(card.id)
  }))

 timeline = document.getElementById('timeline');

cardsData.forEach(card => {
  const el = document.createElement('div');
  el.className = 'timeline-card';
  el.innerHTML = `
    <div>${card.createdAt.toLocaleString()}</div>
    <h3>${card.name}</h3>
    <p>${card.desc || ''}</p>
  `;
  timeline.appendChild(el);
});

  const grouped = listsData.map(list => ({
    id: list.id,
    name: list.name,
    tasks: cardsData.filter(card => card.idList === list.id)
  }))

  console.log(grouped)

  const summarizeData = await fetchN8NData(grouped);
  console.log('summarizeData:', summarizeData);

  const summarizeBtn = document.getElementById('summarizeBtn');
  summarizeBtn.onclick = () => {
    const panel = document.getElementById('summary-panel');
    panel.innerHTML = '';
    panel.style.display = 'block';

    const text = typeof summarizeData === 'string' ? summarizeData : JSON.stringify(summarizeData, null, 2);

    // Affiche chaque bloc séparé par une ligne vide
    text.split('\n\n').forEach(block => {
      if (!block.trim()) return;
      const section = document.createElement('div');
      section.style.marginBottom = '16px';

      const lines = block.split('\n');
      // Première ligne = titre du bloc (ex: "Résumé :")
      if (lines.length > 1 && lines[0].endsWith(':')) {
        const title = document.createElement('h3');
        title.style.cssText = 'margin:0 0 6px;color:var(--accent);font-size:1rem;';
        title.textContent = lines[0];
        section.appendChild(title);
        lines.slice(1).forEach(line => {
          if (!line.trim()) return;
          const p = document.createElement('p');
          p.style.margin = '0 0 4px';
          p.textContent = line;
          section.appendChild(p);
        });
      } else {
        block.split('\n').forEach(line => {
          if (!line.trim()) return;
          const p = document.createElement('p');
          p.style.margin = '0 0 4px';
          p.textContent = line;
          section.appendChild(p);
        });
      }
      panel.appendChild(section);
    });
  };
})

const trelloIdToDate = (id) => {
  const seconds = parseInt(id.substring(0, 8), 16);
  return new Date(seconds * 1000);
}