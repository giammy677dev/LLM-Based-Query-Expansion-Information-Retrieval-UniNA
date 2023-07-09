function doSearch() {
  var queryMenu = document.getElementById("queryMenu");
  var queryId = parseInt(queryMenu.value, 10);
  var queryText = queryMenu.options[queryMenu.selectedIndex].text;

  loadRelevancyData(function(relevancyData) {
    var xhrSolr = new XMLHttpRequest();
    xhrSolr.onreadystatechange = function() {
      if (xhrSolr.readyState === XMLHttpRequest.DONE) {
        if (xhrSolr.status === 200) {
          var response = JSON.parse(xhrSolr.responseText);
          var searchResultsDiv = document.getElementById("searchResults");
          displaySearchResults(response, relevancyData, queryId, searchResultsDiv);
        } else {
          console.error("Errore durante la ricerca:", xhrSolr.status);
        }
      }
    };

    xhrSolr.open("GET", "http://localhost:8983/solr/projectCore/select?indent=true&q.op=OR&q=" + encodeURIComponent(queryText) + "&rows=1400");
    xhrSolr.send();
  });
}

function loadRelevancyData(callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        var relevancyData = JSON.parse(xhr.responseText);
        callback(relevancyData);
      } else {
        console.error("Errore durante il caricamento delle relazioni di rilevanza:", xhr.status);
      }
    }
  };

  xhr.open("GET", "utils/CranQREL.json");
  xhr.send();
}

function displaySearchResults(results, relevancyData, queryId, searchResultsDiv) {
  searchResultsDiv.innerHTML = "";
  var docs = results.response.docs;

  for (var i = 0; i < docs.length; i++) {
    var result = docs[i];
    var resultDiv = document.createElement("div");

    var title = result.Title[0];
    var doc_id = result.ID[0];
    
    if (isRelevant(doc_id, queryId, relevancyData)) {
      var boldTitle = document.createElement("b");
      boldTitle.textContent = "ID: " + doc_id + " - Titolo: " + title;
      resultDiv.appendChild(boldTitle);
    } else {
      resultDiv.textContent = "ID: " + doc_id + " - Titolo: " + title;
    }

    searchResultsDiv.appendChild(resultDiv);
  }
}

function isRelevant(doc_id, queryId, relevancyData) {
  // Verifica se l'id è presente nel JSON delle relazioni di rilevanza
  // e restituisci true se è rilevante, altrimenti false
  for (var i = 0; i < relevancyData.length; i++) {
    var relevancyEntry = relevancyData[i];
    if (relevancyEntry.id_query === queryId.toString() && relevancyEntry.id_documento === doc_id.toString()) {
      return true;
    }
  }
  return false;
}
