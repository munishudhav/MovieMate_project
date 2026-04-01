const API_URL = 'https://www.omdbapi.com/?apikey=thewdb&s=';

const DOM = {
    body: document.body,
    themeToggle: document.getElementById('theme-toggle'),
    searchInput: document.getElementById('search-input'),
    searchBtn: document.getElementById('search-btn'),
    yearFilter: document.getElementById('year-filter'),
    sortSelect: document.getElementById('sort-select'),
    movieContainer: document.getElementById('movie-container'),
    favoritesContainer: document.getElementById('favorites-container'),
    loadingSpinner: document.getElementById('loading-spinner'),
    controlsSection: document.getElementById('controls-section')
};

const state = {
    currentMovies: [],
    favorites: (() => {
        try { return JSON.parse(localStorage.getItem('moviemate_favorites')) || []; } 
        catch { return []; }
    })()
};

const initTheme = () => DOM.body.setAttribute('data-theme', localStorage.getItem('moviemate_theme') || 'dark');

const handleSearch = () => {
    const query = DOM.searchInput.value.trim();
    if (query) fetchMovies(query);
};

const initEventListeners = () => {
    DOM.themeToggle.addEventListener('click', () => {
        const newTheme = DOM.body.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        DOM.body.setAttribute('data-theme', newTheme);
        localStorage.setItem('moviemate_theme', newTheme);
    });
    DOM.searchBtn.addEventListener('click', handleSearch);
    DOM.searchInput.addEventListener('keypress', e => e.key === 'Enter' && handleSearch());
    DOM.yearFilter.addEventListener('change', applyFiltersAndSort);
    DOM.sortSelect.addEventListener('change', applyFiltersAndSort);
    DOM.movieContainer.addEventListener('click', handleFavoriteClick);
    DOM.favoritesContainer.addEventListener('click', handleFavoriteClick);
};

const handleFavoriteClick = (e) => {
    const btn = e.target.closest('.fav-btn');
    if (!btn) return;
    toggleFavorite(btn.dataset.id, e.currentTarget === DOM.favoritesContainer ? state.favorites : state.currentMovies);
};

const populateYearFilter = (movies) => {
    const years = [...new Set(movies.map(m => m.Year))].sort((a, b) => parseInt(b, 10) - parseInt(a, 10));
    DOM.yearFilter.innerHTML = `<option value="">All Years</option>${years.map(y => `<option value="${y}">${y}</option>`).join('')}`;
};

const createMovieCard = ({ Title, Year, Poster, imdbID }, isFav) => `
    <div class="movie-card" title="${Title}">
        <div class="poster-container">
            <img src="${Poster !== 'N/A' ? Poster : 'https://placehold.co/300x450/181818/ffffff?text=No+Poster'}" alt="${Title}" class="movie-poster" loading="lazy">
        </div>
        <div class="movie-info">
            <h3 class="movie-title">${Title}</h3>
            <span class="movie-year">${Year}</span>
            <button class="fav-btn ${isFav ? 'active' : ''}" data-id="${imdbID}" aria-label="${isFav ? 'Remove' : 'Add'}">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFav ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                ${isFav ? 'My List' : 'Add to List'}
            </button>
        </div>
    </div>
`;

const renderMovies = (movies, container) => {
    container.innerHTML = movies.length 
        ? movies.map(m => createMovieCard(m, state.favorites.some(f => f.imdbID === m.imdbID))).join('')
        : '<div class="empty-state">No movies found matching your criteria.</div>';
};

const updateUIState = (isLoading) => {
    if (isLoading) DOM.movieContainer.innerHTML = '';
    DOM.controlsSection.classList.toggle('hidden', isLoading);
    DOM.loadingSpinner.classList.toggle('hidden', !isLoading);
};

const fetchMovies = async (query) => {
    updateUIState(true);
    try {
        const res = await fetch(`${API_URL}${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error();
        const { Response, Search, Error } = await res.json();
        
        updateUIState(false);
        if (Response === 'True') {
            state.currentMovies = Search;
            DOM.controlsSection.classList.remove('hidden');
            populateYearFilter(Search);
            applyFiltersAndSort();
        } else {
            state.currentMovies = [];
            DOM.movieContainer.innerHTML = `<div class="empty-state">${Error}</div>`;
            DOM.yearFilter.innerHTML = '<option value="">All Years</option>';
        }
    } catch {
        updateUIState(false);
        DOM.movieContainer.innerHTML = '<div class="empty-state">Unable to connect. Please check your connection.</div>';
    }
};

const applyFiltersAndSort = () => {
    const { value: year } = DOM.yearFilter;
    const { value: sort } = DOM.sortSelect;
    
    const result = state.currentMovies.filter(m => !year || m.Year === year);
    if (sort === 'title-asc') result.sort((a, b) => a.Title.localeCompare(b.Title));
    else if (sort === 'title-desc') result.sort((a, b) => b.Title.localeCompare(a.Title));
        
    renderMovies(result, DOM.movieContainer);
};

const toggleFavorite = (id, sourceArray) => {
    const idx = state.favorites.findIndex(f => f.imdbID === id);
    if (idx > -1) state.favorites.splice(idx, 1);
    else {
        const m = sourceArray.find(m => m.imdbID === id) || state.favorites.find(f => f.imdbID === id);
        if (m) state.favorites.push(m);
    }
    
    try { localStorage.setItem('moviemate_favorites', JSON.stringify(state.favorites)); } catch {}
    
    applyFiltersAndSort();
    renderMovies(state.favorites, DOM.favoritesContainer);
};

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initEventListeners();
    fetchMovies('movie');
    
    if (state.favorites.length === 0) {
        DOM.favoritesContainer.innerHTML = '<div class="empty-state">Your list is empty. Add movies you want to watch!</div>';
    } else {
        renderMovies(state.favorites, DOM.favoritesContainer);
    }
});
