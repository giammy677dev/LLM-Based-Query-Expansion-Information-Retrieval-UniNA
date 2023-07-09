function doSearch() {
  var queryMenu = document.getElementById("queryMenu");
  var searchQuery = queryMenu.options[queryMenu.selectedIndex].text;

  // Esegui una richiesta AJAX al server Solr (localhost:8983)
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
              var response = JSON.parse(xhr.responseText);
              console.log(response);
              displaySearchResults(response);
          } else {
              console.error("Errore durante la ricerca:", xhr.status);
          }
      }
  };

  xhr.open("GET", "http://localhost:8983/solr/projectCore/select?indent=true&q.op=OR&q=" + encodeURIComponent(searchQuery) + "&rows=1400");
  xhr.send();
}

function displaySearchResults(results) {
  var searchResultsDiv = document.getElementById("searchResults");
  searchResultsDiv.innerHTML = "";

  var docs = results.response.docs;
  for (var i = 0; i < docs.length; i++) {
    var result = docs[i];
    var resultDiv = document.createElement("div");

    var title = result.Title[0];
    var id = result.ID[0];

    resultDiv.textContent = "ID: " + id + " - Titolo: " + title;
    searchResultsDiv.appendChild(resultDiv);
  }
}
