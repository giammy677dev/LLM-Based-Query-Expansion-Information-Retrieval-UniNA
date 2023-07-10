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

public class customPlugin extends SearchComponent {
    private static final Logger LOG = LoggerFactory.getLogger(customPlugin.class);
    String filePath = "/query.json";

    @Override
    public void prepare(ResponseBuilder rb) throws IOException {
        String originalQuery = rb.req.getParams().get("q");
        LOG.info("Query originale");
        LOG.info(originalQuery);

        try {
            ObjectMapper mapper = new ObjectMapper();
            JsonNode rootNode;
            try (InputStream inputStream = customPlugin.class.getResourceAsStream(filePath);
                 InputStreamReader reader = new InputStreamReader(inputStream)) {
                rootNode = mapper.readTree(reader);
            }

            if (rootNode.isArray()) {
                for (JsonNode jsonNode : rootNode) {
                    String text = jsonNode.get("text").asText();

                    if (text != null && text.equals(originalQuery)) {
                        String id = jsonNode.get("id").asText();
                        LOG.info("Found matching text! ID: " + id);
                        break; // Trovato una corrispondenza, interrompi il ciclo
                    }
                }
            }
        } catch (IOException e) {
            e.printStackTrace();
        }

        String modifiedQuery = originalQuery + " aircraft";

        ModifiableSolrParams newParams = new ModifiableSolrParams(rb.req.getParams());
        newParams.set("q", modifiedQuery);

        rb.req.setParams(newParams);
        LOG.info("Sono nel prepare");
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
}
