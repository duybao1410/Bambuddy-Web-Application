 const searchInput = document.querySelector('input[name="search"]');
    const resultsBox = document.getElementById('autocomplete-results');
    let debounceTimer;


    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim();
      clearTimeout(debounceTimer);
      if (!query) {
        resultsBox.innerHTML = '';
        return;
      }
      debounceTimer = setTimeout(async () => {
        try {
          const res = await fetch(`/search?search=${encodeURIComponent(query)}`);
          const data = await res.json();
          if (data.success && data.data.length > 0) {
            resultsBox.innerHTML = data.data
              .map(item => `
                <li class="list-group-item list-group-item-action" role="option" onclick="selectSuggestion('${item.title}')">
                  <strong>${item.title}</strong><br>
                  <small>${item.location.city}</small>
                </li>
              `)
              .join('');
          } else {
            resultsBox.innerHTML = '<li class="list-group-item" role="option">No results found</li>';
          }
        } catch (err) {
          console.error('Autocomplete fetch failed:', err);
          resultsBox.innerHTML = '<li class="list-group-item" role="option">Error fetching results</li>';
        }
      }, 300);
    });


    function selectSuggestion(value) {
      searchInput.value = value;
      resultsBox.innerHTML = '';
      searchInput.closest('form').submit();
    }


    document.addEventListener('click', (e) => {
      if (!resultsBox.contains(e.target) && e.target !== searchInput) {
        resultsBox.innerHTML = '';
      }
    }); 