package com.example.solrplugin;

import org.apache.solr.handler.component.ResponseBuilder;
import org.apache.solr.handler.component.SearchComponent;
import java.io.IOException;

import org.apache.http.HttpEntity;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;
import org.apache.solr.common.params.ModifiableSolrParams;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.util.ArrayList;
import java.util.List;

public class customPlugin extends SearchComponent {
    private static final Logger LOG = LoggerFactory.getLogger(customPlugin.class);
    String queryFilePath = "/query.json";
    String relFilePath = "/CranQREL.json";
    String docFilePath = "/corpus.json";
    int query_id = 0;
    List<String> idDocumentsList = new ArrayList<>();
    List<String> contentDocumentsList = new ArrayList<>();

    @Override
    public void prepare(ResponseBuilder rb) throws IOException {
        String originalQuery = rb.req.getParams().get("q");
        LOG.info("Query originale");
        LOG.info(originalQuery);

        query_id = getQueryID(originalQuery); //Chiamo la funzione per ottenere l'ID della query selezionata
        LOG.info("ID query: " + query_id);

        idDocumentsList.clear(); //Svuoto l'array dei documenti prima di riempirlo con gli id dei documenti rilevanti per la query selezionata

        idDocumentsList = getDocumentsID(); //Chiamo la funzione per ottenere gli ID dei documenti rilevanti per la query selezionata

        LOG.info("Lista degli id_documento corrispondenti:");
        for (String id_documento : idDocumentsList) {
            LOG.info("id_documento ARRAY ORIGINALE: " + id_documento);
        }

        // Di tutti i documenti rilevanti, ne prendo solo 1/3 per passarli a ChatGPT
        int idDocumentsListSize = idDocumentsList.size();
        int filteredIdDocumentsListSize = Math.max(idDocumentsListSize / 3, 1); // Calcola la nuova dimensione della lista
        List<String> filteredIdDocumentsList = new ArrayList<>(idDocumentsList.subList(0, filteredIdDocumentsListSize));

        LOG.info("Lista degli id_documento filtrati:");
        for (String id_documento : filteredIdDocumentsList) {
            LOG.info("id_documento ARRAY FILTRATO: " + id_documento);
        }
        
        contentDocumentsList.clear(); //Svuoto l'array dei documenti prima di riempirlo con il contenuto dei documenti rilevanti per la query selezionata da passare a ChatGPT

        contentDocumentsList = getDocumentsContent(filteredIdDocumentsList); //Chiamo la funzione per ottenere gli ID dei documenti rilevanti per la query selezionata
        
        // Preparo la richiesta a ChatGPT
        String chatGPTQuery = "";
        for (String content: contentDocumentsList) {
            String chatGPTResponse = chatGPTRequest("Scrivimi in inglese le possibili query che un utente potrebbe fare per vedersi restituito il seguente documento da un sistema di Information Retrieval: " + content + ". Scrivimi soltanto le possibili query senza aggiungere nessun altro testo.");
            chatGPTQuery = chatGPTQuery + chatGPTResponse;
        }

        chatGPTQuery = chatGPTQuery.replaceAll("\\d", ""); // Rimuovo i numeri
        chatGPTQuery = chatGPTQuery.replaceAll("\\p{Punct}", ""); // Rimuovo i segni di interpunzione
        chatGPTQuery = chatGPTQuery.replace("\n", ""); // Rimuovo eventuali ritorni a capo

        if (chatGPTQuery.length() > 500) {
            chatGPTQuery.substring(0, 500);
        }
        
        LOG.info("CHATGPT QUERY NO NUM NO PUNCT: " + chatGPTQuery);
        
        String expandedQuery = originalQuery + chatGPTQuery;

        LOG.info("QUERY ESPANSA che mando a Solr: " + expandedQuery);

        ModifiableSolrParams newParams = new ModifiableSolrParams(rb.req.getParams());
        newParams.set("q", expandedQuery);
        rb.req.setParams(newParams);
    }

    @Override
    public void process(ResponseBuilder rb) throws IOException {
        LOG.info("PROCESS");
        LOG.info(rb.req.getParams().get("q"));
    }

    @Override
    public String getDescription() {
        return "Plugin di ricerca integrato con ChatGPT.";
    }

    // QUERY - Cerco la corrispondenza (tramite il suo testo) tra l'ID della query selezionata e l'ID della query in query.json
    public int getQueryID(String originalQuery) {
        try {
            ObjectMapper queryMapper = new ObjectMapper();
            JsonNode queryRootNode;
            try (InputStream queryInputStream = customPlugin.class.getResourceAsStream(queryFilePath);
                 InputStreamReader queryReader = new InputStreamReader(queryInputStream)) {
                queryRootNode = queryMapper.readTree(queryReader);
            }

            if (queryRootNode.isArray()) {
                for (JsonNode queryJsonNode : queryRootNode) {
                    String text = queryJsonNode.get("text").asText();

                    if (text != null && text.equals(originalQuery)) {
                        String idString = queryJsonNode.get("id").asText();
                        query_id = Integer.parseInt(idString);
                        break; // Trovata la prima corrispondenza, interrompi il ciclo
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return query_id;
    }

    // REL - Cerco gli ID dei documenti rilevanti per la query selezionata in CranQREL.json
    public List<String> getDocumentsID() {
        try {
            ObjectMapper relMapper = new ObjectMapper();
            JsonNode relRootNode;
            try (InputStream relInputStream = customPlugin.class.getResourceAsStream(relFilePath);
                 InputStreamReader relReader = new InputStreamReader(relInputStream)) {
                relRootNode = relMapper.readTree(relReader);
            }

            if (relRootNode.isArray()) {
                for (JsonNode relJsonNode : relRootNode) {
                    int id_query = relJsonNode.get("id_query").asInt();

                    if (id_query == query_id) {
                        String id_document = relJsonNode.get("id_documento").asText();
                        idDocumentsList.add(id_document);
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return idDocumentsList;
    }

    // DOC - Cerco il contenuto dei documenti rilevanti per la query selezionata in corpus.json
    public List<String> getDocumentsContent(List<String> filteredIdDocumentsList) {
        try {
            ObjectMapper docMapper = new ObjectMapper();
            JsonNode docRootNode;
            try (InputStream docInputStream = customPlugin.class.getResourceAsStream(docFilePath);
                 InputStreamReader docReader = new InputStreamReader(docInputStream)) {
                docRootNode = docMapper.readTree(docReader);
            }

            if (docRootNode.isArray()) {
                for (JsonNode docJsonNode : docRootNode) {
                    int id_doc = docJsonNode.get("ID").asInt();

                    for (String filteredId : filteredIdDocumentsList) {
                        int filteredIdInt = Integer.parseInt(filteredId);
                        if (id_doc == filteredIdInt) {
                            String document_content = docJsonNode.get("Content").asText();
                            contentDocumentsList.add(document_content);
                        }
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }
        return contentDocumentsList;
    }

    // Invio i documenti selezionati a ChatGPT
    public static String chatGPTRequest(String text) {
        HttpClient httpClient = HttpClients.createDefault();
        HttpPost httpPost = new HttpPost("https://api.openai.com/v1/chat/completions");

        // Imposta l'header di autorizzazione con il tuo token API di OpenAI
        httpPost.setHeader(HttpHeaders.AUTHORIZATION, "Bearer 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");

        // Imposta l'header per indicare il tipo di contenuto JSON
        httpPost.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");

        String model = "gpt-3.5-turbo";
        String role = "user";
        String max_tokens = "3500";
        String content = "";

        String jsonPayload = String.format("{\"model\": \"%s\",\"messages\":[{\"role\":\"%s\",\"content\":\"%s\"}],\"max_tokens\":%s}", model, role, text, max_tokens);

        try {
            // Imposta il corpo della richiesta con il payload JSON
            httpPost.setEntity(new StringEntity(jsonPayload));

            // Esegue la richiesta
            HttpResponse response = httpClient.execute(httpPost);

            // Legge la risposta
            HttpEntity entity = response.getEntity();
            String responseBody = EntityUtils.toString(entity);

            // Utilizza la libreria JSON di Java per analizzare la risposta JSON
            ObjectMapper objectMapper = new ObjectMapper();
            JsonNode responseJson = objectMapper.readTree(responseBody);

            // Estrai il campo "content" dalla risposta JSON
            content = responseJson.get("choices").get(0).get("message").get("content").asText();
        } catch (IOException e) {
            e.printStackTrace();
        }
        return content;
    }
}