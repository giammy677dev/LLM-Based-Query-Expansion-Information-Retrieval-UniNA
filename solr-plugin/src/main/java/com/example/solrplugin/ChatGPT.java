package com.example.solrplugin;

import java.io.IOException;
import org.apache.http.HttpEntity;
import org.apache.http.HttpHeaders;
import org.apache.http.HttpResponse;
import org.apache.http.client.HttpClient;
import org.apache.http.client.methods.HttpPost;
import org.apache.http.entity.StringEntity;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.util.EntityUtils;

public class ChatGPT {
    public static void chatGPT(String text) throws Exception {
        HttpClient httpClient = HttpClients.createDefault();
        HttpPost httpPost = new HttpPost("https://api.openai.com/v1/chat/completions");

        // Imposta l'header di autorizzazione con il tuo token API di OpenAI
        httpPost.setHeader(HttpHeaders.AUTHORIZATION, "Bearer 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");

        // Imposta l'header per indicare il tipo di contenuto JSON
        httpPost.setHeader(HttpHeaders.CONTENT_TYPE, "application/json");

        String model = "gpt-3.5-turbo";
        String role = "user";
        String max_tokens = "3500";

        String jsonPayload = String.format("{\"model\": \"%s\",\"messages\":[{\"role\":\"%s\",\"content\":\"%s\"}],\"max_tokens\":%s}", model, role, text, max_tokens);

        try {
            // Imposta il corpo della richiesta con il payload JSON
            httpPost.setEntity(new StringEntity(jsonPayload));

            // Esegue la richiesta
            HttpResponse response = httpClient.execute(httpPost);

            // Legge la risposta
            HttpEntity entity = response.getEntity();
            String responseBody = EntityUtils.toString(entity);
            System.out.println(responseBody);

            // Fai attenzione a gestire eventuali eccezioni e a chiudere le risorse correttamente
        } catch (IOException e) {
            e.printStackTrace();
        }
    }

    public static void main(String[] args) throws Exception {
        chatGPT("This is a test.");
    }
}
