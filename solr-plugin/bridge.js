function eseguiRicerca() {
  console.log("La funzione eseguiRicerca è stata richiamata!");

  var searchQuery = document.getElementById("queryMenu").value;

  // Esegui una richiesta AJAX al server Solr (localhost:8983)
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
      if (xhr.readyState === XMLHttpRequest.DONE) {
          if (xhr.status === 200) {
              var response = JSON.parse(xhr.responseText);
              displaySearchResults(response);
          } else {
              console.error("Errore durante la ricerca:", xhr.status);
          }
      }
  };
  xhr.open("GET", "http://localhost:8983/solr/projectCore/select?indent=true&q.op=OR&q=aircraft");// + encodeURIComponent(searchQuery));
  xhr.send();
}

function displaySearchResults(results) {
  console.log("La funzione displaySearchResults è stata richiamata!");

  var searchResultsDiv = document.getElementById("searchResults");
  searchResultsDiv.innerHTML = "";

  for (var key in results) {
    if (results.hasOwnProperty(key)) {
      var result = results[key];
      var resultDiv = document.createElement("div");
      resultDiv.textContent = result.title;
      searchResultsDiv.appendChild(resultDiv);
      
      console.log(result)
    }
  }
}
