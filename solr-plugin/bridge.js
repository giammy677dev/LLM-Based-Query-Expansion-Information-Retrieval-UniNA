let noGPTChart;
let GPTChart;
const standardRecall = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function doSearch() {
  clearUI();
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

  //Mostra gli elementi di caricamento
  var loadingElement = document.getElementById('loading');
  loadingElement.style.display = 'block';
  var loaderElement = document.getElementById('loader');
  loaderElement.style.display = 'block';

  loadRelevancyData(queryId, function(relevancyData) {
    var xhrSolr = new XMLHttpRequest();
    xhrSolr.onreadystatechange = function() {
      if (xhrSolr.readyState === XMLHttpRequest.DONE) {
        // Nascondi gli elementi di caricamento
        loadingElement.style.display = 'none';
        loaderElement.style.display = 'none';
        if (xhrSolr.status === 200) {
          var response = JSON.parse(xhrSolr.responseText);
          var searchResultsDiv = document.getElementById("searchResultsChatGPT");
          displaySearchResultsGPT(response, relevancyData, searchResultsDiv);
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
  var threshold = -1;
  var precisionArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (var i = 0; i < docs.length; i++) {
    var result = docs[i];
    var resultDiv = document.createElement("button");
    var contentDiv = document.createElement("div");
    contentDiv.style.display = "none";

    var doc_id = result.ID[0];
    var title = result.Title[0];
    var content = result.Content;

    if (!relevantDocsForChatGPT.includes(doc_id.toString())) { // Se il documento non è incluso nei documenti mandati a ChatGPT...
      if (relevantDocs.includes(doc_id.toString())) { // ... e se è rilevante, allora entra
        numRelevantDocs++;
        var position = i - numRelevantDocsUsedForChatGPT + 1; //Posizione nel ranking di un documento rilevante non utilizzato per ChatGPT
        var recall = calculateRecall(numRelevantDocs, totalRelevantDocs);
        var precision = calculatePrecision(numRelevantDocs, position);

        var boldTitle = document.createElement("b");
        boldTitle.textContent = "ID: " + doc_id + " - Titolo: " + title + " - Posizione: " + position + " - Numero documento: " + numRelevantDocs +  " - Recall: " + recall + "% - Precision: " + precision + "%";
        resultDiv.appendChild(boldTitle);

        if (Math.floor(recall / 10) > threshold) {
          threshold = Math.floor(recall / 10);
          precisionArray[threshold] = precision;
        }
      } else {
        resultDiv.textContent = "ID: " + doc_id + " - Titolo: " + title;
      }
      
      resultDiv.addEventListener("click", function() {
        if (this.nextElementSibling.style.display == "none") {
          this.nextElementSibling.style.display = "block";
        }
        else {
          this.nextElementSibling.style.display = "none";
        }
        
      });
      searchResultsDiv.appendChild(resultDiv);
      contentDiv.textContent = content;
      searchResultsDiv.appendChild(contentDiv);
    }
    else {
      numRelevantDocsUsedForChatGPT++;
    }
  }

  for (let i = 9; i >= 0; i--) {
    if (precisionArray[i] == 0) {
      precisionArray[i] = precisionArray[i+1];
    }
  }
  drawResults(precisionArray);
}

function drawResults(precisionArray) {
  const precisionNoGPT = precisionArray;

  var h3Element = document.getElementById('noGPTTitle');
  h3Element.textContent = 'Ranking non utilizzando ChatGPT';

  if (!noGPTChart) {
    noGPTChart = new Chart(document.getElementById("noGPTChart"), {
      type: "line",
      data: {
        labels: standardRecall,
        datasets: [
          {
            fill: false,
            lineTension: 0,
            backgroundColor: "rgba(0,0,255,1.0)",
            borderColor: "rgba(0,0,255,0.1)",
            data: precisionNoGPT,
          },
        ],
      },
      options: {
        legend: { display: false },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "Recall",
              },
            },
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "Precision",
              },
              ticks: { min: 0, max: 100 },
            },
          ],
        },
        tooltips: {
          callbacks: {
            title: function (tooltipItem, data) {
              // Restituisci il testo desiderato per il titolo dell'etichetta del tooltip
              return '';
            },
            label: function (tooltipItem, data) {
              // Restituisci il testo desiderato per il testo vicino alle coordinate del punto
              return 'Recall: ' + tooltipItem.xLabel + '%, Precision: ' + tooltipItem.yLabel + '%';
            }
          }
        }
      },
    });
  } else {
    noGPTChart.data.datasets[0].data = precisionNoGPT;
    noGPTChart.update();
  }

  doSearchChatGPT();
}

function displaySearchResultsGPT(results, relevantDocs, searchResultsDiv) {
  searchResultsDiv.innerHTML = "";

  var relevantDocsForChatGPT = getRelevantDocumentsForChatGPT(relevantDocs);

  var docs = results.response.docs;
  var numRelevantDocs = 0; // Contatore per il numero di documenti rilevanti trovati
  var numRelevantDocsUsedForChatGPT = 0; // Contatore per il numero di documenti rilevanti trovati ma che sono stati usati per ChatGPT e quindi vanno esclusi
  var totalRelevantDocs = relevantDocs.length - relevantDocsForChatGPT.length; // Numero totale di documenti rilevanti esclusi quelli utilizzati per ChatGPT
  var threshold = -1;
  var precisionArray = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  for (var i = 0; i < docs.length; i++) {
    var result = docs[i];

    var resultDiv = document.createElement("button");
    var contentDiv = document.createElement("div");
    contentDiv.style.display = "none";

    var doc_id = result.ID[0];
    var title = result.Title[0];
    var content = result.Content;

    if (!relevantDocsForChatGPT.includes(doc_id.toString())) { // Se il documento non è incluso nei documenti mandati a ChatGPT...
      if (relevantDocs.includes(doc_id.toString())) { // ... e se è rilevante, allora entra
        numRelevantDocs++;
        var position = i - numRelevantDocsUsedForChatGPT + 1; //Posizione nel ranking di un documento rilevante non utilizzato per ChatGPT
        var recall = calculateRecall(numRelevantDocs, totalRelevantDocs);
        var precision = calculatePrecision(numRelevantDocs, position);

        var boldTitle = document.createElement("b");
        boldTitle.textContent = "ID: " + doc_id + " - Titolo: " + title + " - Posizione: " + position + " - Numero documento: " + numRelevantDocs +  " - Recall: " + recall + "% - Precision: " + precision + "%";
        resultDiv.appendChild(boldTitle);

        if (Math.floor(recall / 10) > threshold) {
          threshold = Math.floor(recall / 10);
          precisionArray[threshold] = precision;
        }
      } else {
        resultDiv.textContent = "ID: " + doc_id + " - Titolo: " + title;
      }
      resultDiv.addEventListener("click", function() {
        if (this.nextElementSibling.style.display == "none") {
          this.nextElementSibling.style.display = "block";
        }
        else {
          this.nextElementSibling.style.display = "none";
        }
        
      });
      searchResultsDiv.appendChild(resultDiv);
      contentDiv.textContent = content;
      searchResultsDiv.appendChild(contentDiv);
    }
    else {
      numRelevantDocsUsedForChatGPT++;
    }
  }

  for (let i = 9; i >= 0; i--) {
    if (precisionArray[i] == 0) {
      precisionArray[i] = precisionArray[i+1];
    }
  }
  drawResultsGPT(precisionArray);
}


function drawResultsGPT(precisionArray) {
  const precisionGPT = precisionArray;

  var h3Element = document.getElementById('GPTTitle');
  h3Element.textContent = 'Ranking utilizzando ChatGPT';

  if (!GPTChart) {
    GPTChart = new Chart(document.getElementById("GPTChart"), {
      type: "line",
      data: {
        labels: standardRecall,
        datasets: [
          {
            fill: false,
            lineTension: 0,
            backgroundColor: "rgba(0,0,255,1.0)",
            borderColor: "rgba(0,0,255,0.1)",
            data: precisionGPT,
          },
        ],
      },
      options: {
        legend: { display: false },
        scales: {
          xAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "Recall",
              },
            },
          ],
          yAxes: [
            {
              scaleLabel: {
                display: true,
                labelString: "Precision",
              },
              ticks: { min: 0, max: 100 },
            },
          ],
        },
        tooltips: {
          callbacks: {
            title: function (tooltipItem, data) {
              // Restituisci il testo desiderato per il titolo dell'etichetta del tooltip
              return '';
            },
            label: function (tooltipItem, data) {
              // Restituisci il testo desiderato per il testo vicino alle coordinate del punto
              return 'Recall: ' + tooltipItem.xLabel + '%, Precision: ' + tooltipItem.yLabel + '%';
            }
          }
        }
      },
    });
  } else {
    GPTChart.data.datasets[0].data = precisionGPT;
    GPTChart.update();
  }
  showUI();
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

function clearUI() {
  var GPTChart = document.getElementById('GPTChart');
  GPTChart.style.display = 'none';
  var GPTTitle = document.getElementById('GPTTitle');
  GPTTitle.style.display = 'none';
  var searchResultsChatGPT = document.getElementById('searchResultsChatGPT');
  searchResultsChatGPT.style.display = 'none';
}

function showUI() {
  var GPTChart = document.getElementById('GPTChart');
  GPTChart.style.display = 'block';
  var GPTTitle = document.getElementById('GPTTitle');
  GPTTitle.style.display = 'block';
  var searchResultsChatGPT = document.getElementById('searchResultsChatGPT');
  searchResultsChatGPT.style.display = 'block';
}