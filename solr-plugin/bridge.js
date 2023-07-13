function doSearch() {
  var queryMenu = document.getElementById("queryMenu");
  var queryId = parseInt(queryMenu.value, 10);
  var queryText = queryMenu.options[queryMenu.selectedIndex].text;

  loadRelevancyData(queryId, function(relevancyData) {
    var xhrSolr = new XMLHttpRequest();
    xhrSolr.onreadystatechange = function() {
      if (xhrSolr.readyState === XMLHttpRequest.DONE) {
        if (xhrSolr.status === 200) {
          var response = JSON.parse(xhrSolr.responseText);
          var searchResultsDiv = document.getElementById("searchResults");
          displaySearchResults(response, relevancyData, searchResultsDiv);
        } else {
          console.error("Errore durante la ricerca:", xhrSolr.status);
        }
      }
    };

    xhrSolr.open("GET", "http://localhost:8983/solr/projectCore/select?indent=true&q.op=OR&q=" + encodeURIComponent(queryText) + "&rows=1400");
    xhrSolr.send();
  });
}

function doSearchChatGPT() {
  var queryMenu = document.getElementById("queryMenu");
  var queryId = parseInt(queryMenu.value, 10);
  var queryText = queryMenu.options[queryMenu.selectedIndex].text;

  loadRelevancyData(queryId, function(relevancyData) {
    var xhrSolr = new XMLHttpRequest();
    xhrSolr.onreadystatechange = function() {
      if (xhrSolr.readyState === XMLHttpRequest.DONE) {
        if (xhrSolr.status === 200) {
          var response = JSON.parse(xhrSolr.responseText);
          var searchResultsDiv = document.getElementById("searchResults");
          displaySearchResults(response, relevancyData, searchResultsDiv);
        } else {
          console.error("Errore durante la ricerca:", xhrSolr.status);
        }
      }
    };

    xhrSolr.open("GET", "http://localhost:8983/solr/projectCore/selectGPT?indent=true&q.op=OR&q=" + encodeURIComponent(queryText) + "&rows=1400");
    xhrSolr.send();
  });
}

function loadRelevancyData(queryId, callback) {
  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.DONE) {
      if (xhr.status === 200) {
        var relevancyData = JSON.parse(xhr.responseText);

        // Filtra solo gli oggetti con id_query corrispondente alla query selezionata
        var filteredData = relevancyData.filter(function(entry) {
          return entry.id_query === queryId.toString();
        });

        // Crea un array con gli ID dei documenti rilevanti
        var relevantDocs = filteredData.map(function(entry) {
          return entry.id_documento;
        });
        callback(relevantDocs);
      } else {
        console.error("Errore durante il caricamento delle relazioni di rilevanza:", xhr.status);
      }
    }
  };

  xhr.open("GET", "utils/CranQREL.json");
  xhr.send();
}

function displaySearchResults(results, relevantDocs, searchResultsDiv) {
  searchResultsDiv.innerHTML = "";

  var relevantDocsForChatGPT = getRelevantDocumentsForChatGPT(relevantDocs);

  var docs = results.response.docs;
  var numRelevantDocs = 0; // Contatore per il numero di documenti rilevanti trovati
  var numRelevantDocsUsedForChatGPT = 0; // Contatore per il numero di documenti rilevanti trovati ma che sono stati usati per ChatGPT e quindi vanno esclusi
  var totalRelevantDocs = relevantDocs.length - relevantDocsForChatGPT.length; // Numero totale di documenti rilevanti esclusi quelli utilizzati per ChatGPT

  for (var i = 0; i < docs.length; i++) {
    var result = docs[i];
    var resultDiv = document.createElement("div");

    var title = result.Title[0];
    var doc_id = result.ID[0];

    if (!relevantDocsForChatGPT.includes(doc_id.toString())) { // Se il documento non è incluso nei documenti mandati a ChatGPT...
      if (relevantDocs.includes(doc_id.toString())) { // ... e se è rilevante, allora entra
        numRelevantDocs++;
        var position = i - numRelevantDocsUsedForChatGPT + 1; //Posizione nel ranking di un documento rilevante non utilizzato per ChatGPT

        var boldTitle = document.createElement("b");
        boldTitle.textContent = "ID: " + doc_id + " - Titolo: " + title + " - Posizione: " + position + " - Numero documento: " + numRelevantDocs +  " - Recall: " + calculateRecall(numRelevantDocs, totalRelevantDocs) + "% - Precision: " + calculatePrecision(numRelevantDocs, position) + "%";
        resultDiv.appendChild(boldTitle);
      } else {
        resultDiv.textContent = "ID: " + doc_id + " - Titolo: " + title;
      }
      searchResultsDiv.appendChild(resultDiv);
    }
    else {
      numRelevantDocsUsedForChatGPT++;
    }
  }
}

function getRelevantDocumentsForChatGPT(relevantDocs) {
  var relevantDocsForChatGPT = relevantDocs.slice(0, Math.floor(relevantDocs.length / 3));
  if (relevantDocsForChatGPT.length === 0) {
    relevantDocsForChatGPT.push(relevantDocs[0]);
  }
  return relevantDocsForChatGPT;
}

function calculateRecall(numRelevantDocs, totalRelevantDocs) {
  var recall = (numRelevantDocs / totalRelevantDocs) * 100;
  return recall.toFixed(2); // Arrotonda il valore a 2 cifre decimali
}

function calculatePrecision(numRelevantDocs, position) {
  var precision = (numRelevantDocs / position) * 100;
  return precision.toFixed(2); // Arrotonda il valore a 2 cifre decimali
}
