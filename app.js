const API = 'https://countriesnow.space/api/v0.1/countries';
const grid = document.querySelector('#countryGrid');
const statusEl = document.querySelector('#status');
const title = document.querySelector('#resultTitle');
const clearButton = document.querySelector('#clearButton');
const dialog = document.querySelector('#countryDialog');
let countries = [];
const ISO_CODES = `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(' ');
const displayNames = new Intl.DisplayNames(['es'], { type: 'region' });
function offlineCountries() {
  return ISO_CODES.map(code => ({
    name: { common: displayNames.of(code), official: displayNames.of(code) }, flags: {},
    cca3: code,
    capital: [], region: 'País', subregion: '', population: 0, languages: null, currencies: null,
    flagEmoji: [...code].map(letter => String.fromCodePoint(127397 + letter.charCodeAt())).join('')
  })).sort((a,b) => a.name.common.localeCompare(b.name.common, 'es'));
}
const normalize = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const number = value => new Intl.NumberFormat('es-ES').format(value || 0);
const textList = object => object ? Object.values(object).join(', ') : 'No disponible';

function render(list) {
  statusEl.textContent = list.length ? `${list.length} ${list.length === 1 ? 'resultado' : 'resultados'}` : 'No encontramos ningún país.';
  grid.innerHTML = list.map((country, index) => `
    <article class="card" data-index="${index}" tabindex="0">
      <div class="flag-wrap">${country.flags.svg ? `<img src="${country.flags.svg}" alt="Bandera de ${country.name.common}" loading="lazy"><span class="flag-emoji flag-backup">${country.flagEmoji}</span>` : `<span class="flag-emoji">${country.flagEmoji}</span>`}</div>
      <div class="card-body">
        <h3>${country.name.common}</h3><p>${country.region}${country.subregion ? ` · ${country.subregion}` : ''}</p>
        <div class="card-meta"><span>👥 ${number(country.population)}</span><span>📍 ${country.capital?.[0] || 'Sin capital'}</span></div>
      </div>
    </article>`).join('');
  [...grid.children].forEach((card, index) => {
    card.addEventListener('click', () => showDetail(list[index]));
    card.addEventListener('keydown', e => e.key === 'Enter' && showDetail(list[index]));
  });
  grid.querySelectorAll('.flag-wrap img').forEach(img => img.addEventListener('error', () => {
    img.style.display = 'none'; img.nextElementSibling.style.display = 'block';
  }));
}

function showDetail(c) {
  document.querySelector('#dialogContent').innerHTML = `
    ${c.flags.svg ? `<img class="detail-flag" src="${c.flags.svg}" alt="Bandera de ${c.name.common}"><div class="detail-emoji detail-backup">${c.flagEmoji}</div>` : `<div class="detail-emoji">${c.flagEmoji}</div>`}
    <div class="detail-body"><p class="eyebrow">${c.region}</p><h2>${c.name.common}</h2><p>${c.name.official}</p>
      <div class="facts">
        <div class="fact"><small>Capital</small>${c.capital?.[0] || 'No disponible'}</div>
        <div class="fact"><small>Población</small>${number(c.population)}</div>
        <div class="fact"><small>Código ISO</small>${c.cca3 || 'No disponible'}</div>
        <div class="fact"><small>Monedas</small>${c.currencies ? Object.values(c.currencies).map(x => `${x.name} (${x.symbol || ''})`).join(', ') : 'No disponible'}</div>
      </div>
    </div>`;
  dialog.showModal();
  const detailImage = dialog.querySelector('.detail-flag');
  if (detailImage) detailImage.addEventListener('error', () => {
    detailImage.style.display = 'none'; dialog.querySelector('.detail-backup').style.display = 'grid';
  });
}

async function loadCountries() {
  try {
    const capitalsRes = await fetch(`${API}/capital`);
    if (!capitalsRes.ok) throw new Error('API no disponible');
    const capitals = await capitalsRes.json();
    const [currencyResult, populationResult] = await Promise.allSettled([
      fetch(`${API}/currency`).then(r => r.ok ? r.json() : Promise.reject()),
      fetch(`${API}/population`).then(r => r.ok ? r.json() : Promise.reject())
    ]);
    const currencyItems = currencyResult.status === 'fulfilled' ? currencyResult.value.data : [];
    const populationItems = populationResult.status === 'fulfilled' ? populationResult.value.data : [];
    const currencyMap = new Map(currencyItems.map(item => [item.iso2, item]));
    const populationMap = new Map(populationItems.map(item => [item.code || item.iso3, item]));
    countries = capitals.data.map(item => {
      const populationItem = populationMap.get(item.iso3);
      const counts = populationItem?.populationCounts || [];
      const latestPopulation = counts.length ? counts[counts.length - 1].value : 0;
      const spanishName = displayNames.of(item.iso2) || item.name;
      const currency = currencyMap.get(item.iso2)?.currency;
      return {
        name: { common: spanishName, official: item.name },
        cca3: item.iso3,
        flags: { svg: `https://flagcdn.com/${item.iso2.toLowerCase()}.svg` },
        flagEmoji: [...item.iso2].map(letter => String.fromCodePoint(127397 + letter.charCodeAt())).join(''),
        capital: [item.capital].filter(Boolean),
        population: latestPopulation,
        region: 'País', subregion: '', languages: null,
        currencies: currency ? { main: { name: currency, symbol: currency } } : null
      };
    }).sort((a,b) => a.name.common.localeCompare(b.name.common, 'es'));
    render(countries.slice(0, 12));
  } catch {
    countries = offlineCountries();
    render(countries.slice(0, 12));
  }
}

document.querySelector('#searchForm').addEventListener('submit', async e => {
  e.preventDefault();
  const query = document.querySelector('#searchInput').value.trim().toLowerCase();
  if (!query) return;
  title.textContent = `Resultados para “${query}”`; clearButton.hidden = false;
  statusEl.textContent = 'Buscando...';
  try {
    const cleanQuery = normalize(query);
    const matches = countries.filter(c => normalize(c.name.common).includes(cleanQuery));
    if (!matches.length) throw new Error('País no encontrado');
    render(matches);
  } catch {
    if (!countries.length) countries = offlineCountries();
    const cleanQuery = normalize(query);
    let matches = countries.filter(c =>
      normalize(c.name.common).includes(cleanQuery) || normalize(c.name.official).includes(cleanQuery)
    );
    if (!matches.length) matches = offlineCountries().filter(c => normalize(c.name.common).includes(cleanQuery));
    render(matches);
  }
});
clearButton.addEventListener('click', () => { title.textContent='Países destacados'; clearButton.hidden=true; document.querySelector('#searchInput').value=''; render(countries.slice(0,8)); });
document.querySelector('#closeDialog').addEventListener('click', () => dialog.close());
document.querySelector('#themeButton').addEventListener('click', e => { document.body.classList.toggle('light'); e.currentTarget.textContent = document.body.classList.contains('light') ? '☾' : '☀'; });
loadCountries();
