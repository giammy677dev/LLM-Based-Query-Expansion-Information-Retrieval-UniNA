package com.example.solrplugin;

import org.apache.solr.handler.component.ResponseBuilder;
import org.apache.solr.handler.component.SearchComponent;
import java.io.IOException;
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
        
        //chatGPTQuery = 
        
        



        
        //String expandedQuery = originalQuery + chatGPTQuery;

        ModifiableSolrParams newParams = new ModifiableSolrParams(rb.req.getParams());
        //newParams.set("q", expandedQuery);
        rb.req.setParams(newParams);
    }

    @Override
    public void process(ResponseBuilder rb) throws IOException {
        LOG.info("Sono nel process");
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

}