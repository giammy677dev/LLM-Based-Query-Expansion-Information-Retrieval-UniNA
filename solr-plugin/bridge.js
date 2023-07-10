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
        var relevantDocuments = filteredData.map(function(entry) {
          return entry.id_documento;
        });
        callback(relevantDocuments);
      } else {
        console.error("Errore durante il caricamento delle relazioni di rilevanza:", xhr.status);
      }
    }
  };

  xhr.open("GET", "utils/CranQREL.json");
  xhr.send();
}

function displaySearchResults(results, relevantDocuments, searchResultsDiv) {
  searchResultsDiv.innerHTML = "";

  var relevantDocumentsForChatGPT = getRelevantDocumentsForChatGPT(relevantDocuments);

  relevantDocuments = relevantDocuments.filter(document => {
    return !relevantDocumentsForChatGPT.includes(document);
  });

  var docs = results.response.docs;
  var numDocumentiRilevanti = 0; // Contatore per il numero di documenti rilevanti
  var totalDocumentiRilevanti = relevantDocuments.length; // Numero totale di documenti rilevanti

  for (var i = 0; i < docs.length; i++) {
    var result = docs[i];
    var resultDiv = document.createElement("div");

    var title = result.Title[0];
    var doc_id = result.ID[0];
    
    if (relevantDocuments.includes(doc_id.toString())) {
      numDocumentiRilevanti++;
      var position = i + 1;

      var boldTitle = document.createElement("b");
      boldTitle.textContent = "ID: " + doc_id + " - Titolo: " + title + " - Position: " + position + " - Numero documento: " + numDocumentiRilevanti +  " - Recall: " + calculateRecall(numDocumentiRilevanti, totalDocumentiRilevanti) + "% - Precision: " + calculatePrecision(numDocumentiRilevanti, position) + "%";
      resultDiv.appendChild(boldTitle);
    } else {
      resultDiv.textContent = "ID: " + doc_id + " - Titolo: " + title;
    }

    searchResultsDiv.appendChild(resultDiv);
  }
}

function getRelevantDocumentsForChatGPT(relevantDocuments) {
  var relevantDocumentsForChatGPT = relevantDocuments.slice(0, Math.floor(relevantDocuments.length / 3));
  if (relevantDocumentsForChatGPT.length === 0) {
    relevantDocumentsForChatGPT.push(relevantDocuments[0]);
  }
  return relevantDocumentsForChatGPT;
}

function calculateRecall(numDocumentiRilevanti, totalDocumentiRilevanti) {
  // Calcola il valore di Recall
  var recall = (numDocumentiRilevanti / totalDocumentiRilevanti) * 100;
  return recall.toFixed(2); // Arrotonda il valore a 2 cifre decimali
}

function calculatePrecision(numDocumentiRilevanti, position) {
  // Calcola il valore di Precision
  var precision = (numDocumentiRilevanti / position) * 100;
  return precision.toFixed(2); // Arrotonda il valore a 2 cifre decimali
}
