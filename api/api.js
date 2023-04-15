// Import required libraries
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { Configuration, OpenAIApi } from 'openai';
import dotenv from 'dotenv';
import cheerio from 'cheerio';

dotenv.config();


// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Initialize OpenAI API key
const openaiApiKey = process.env.OPENAI_API_KEY;
const configuration = new Configuration({
    apiKey: openaiApiKey, // replace with your own OpenAI API key
});
const serverAPI = new OpenAIApi(configuration);



// Initialize express router
const router = express.Router();

async function scrapeWebsite(url) {
    console.log('Scraping started.');
    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const html = await response.text();
    const $ = cheerio.load(html);
    const textArray = [];

    $('p').each((i, elem) => {
        textArray.push($(elem).text());
    });

    const scrapedText = textArray.join('\n\n');
    return scrapedText;
    //console.log(`Scraped text: ${scrapedText}`);
    //return await extractParagraphs(scrapedText);
}

// Define a function to split text into paragraphs
async function extractParagraphs(text) {
  const sentences = nltk.tokenize.sent_tokenize(text);
  const paragraphs = [];
  let currentParagraph = '';
  
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const isLastSentence = (i === sentences.length - 1);
    
    // Add the current sentence to the current paragraph
    currentParagraph += sentence + ' ';
    
    // If the current sentence ends with a period and the next sentence
    // starts with a capital letter (i.e., a new sentence), or if this is
    // the last sentence in the text, then we end the current paragraph
    if ((sentence.endsWith('.') && sentences[i+1][0].match(/[A-Z]/)) || isLastSentence) {
      paragraphs.push(currentParagraph.trim());
      currentParagraph = '';
    }
  }
  
  return paragraphs;
}




// Endpoint to submit a link for processing
router.post('/link', async (req, res) => {
    try {
        // Get the link from the request body
        const url = req.body.url;
        console.log('url: "' + url + '"');
        // check if link already in db
        let { data } = await supabase.from('links').select().eq('url', url);
        let highlights = [];
        let linkId = null;
        let essayData = null;
        if (data.length > 0) {
            linkId = data[0].id;
            essayData = data[0].content;
        }


        if (data.length > 0) {
            console.log('Link already in db');
            let { data, error } = await supabase.from('highlights').select().eq('linkId', linkId)
            console.log(data);
            if (data.length == 0) {
                highlights = [];
            } else {
                highlights = data.map((highlight) => {
                    return {
                        start: highlight.start,
                        end: highlight.end,
                        summary: highlight.summary,
                        linkId: highlight.linkId,
                        id: highlight.id
                    }
                });
            }

            if (error) {
                console.log(error);
                return res.status(500).json({ error: error.message });
            }
            return res.status(200).json({ data: essayData, highlights: highlights });
        }

        // Parse the text content from the page
        const paragraphs = await scrapeWebsite(url);

        // Insert the link and parsed content into the database
        let { test } = await supabase.from('links').insert({ url, content: paragraphs });
        console.log('Link inserted into db');


        // Return the parsed content to the client
        res.status(200).json({ data: paragraphs, highlights: highlights });
    } catch (error) {
        //console.log(error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to get and display processed text content for a given link
router.get('/text/:id', async (req, res) => {
    try {
        // Get the link ID from the request parameters
        const id = req.params.id;

        // Query the database for the parsed content associated with the ID
        const { data, error } = await supabase.from('links').select('content').eq('id', id);

        // Check for errors
        if (error) {
            return res.status(500).json({ error: error.message });
        }

        // Return the parsed content to the client
        res.status(200).json({ data: data[0].content });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

// Endpoint to create a highlight and generate a summary for a selected text passage
router.post('/highlight', async (req, res) => {
    try {
        // Get the link ID, start and end positions from the request body
        //console.log(req.body);
        // trim whitespace
        let url = req.body.url.trim();
        console.log('url: "' + url + '"');
        console.log('selecting from links, allLinks')
        let { data, error } = await supabase.from('links').select('id').eq('url', url);
        if (error) {
            console.log('Error retrieving data:', error.message)
            return res.status(500).json({ error: error.message });
        }
        if (data.length == 0) {
            // TODO: handle this without error
            console.log('Error: no link found');
            return res.status(500).json({ error: "No link found" });
        }

        let linkId = data[0].id;

        const start = req.body.start;
        const end = req.body.end;
        const text = req.body.text;
        console.log('start: ' + start);
        console.log('end: ' + end);
        console.log('text: ' + text);



        // Insert the highlight and summary into the database
        let highlight = await insertHighlight(linkId, start, end, text);
        res.status(200).json({
            data: highlight
        });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: error.message });
    }
});

// refactored function for inserting a highlight
async function insertHighlight(linkId, start, end, text) {
    try {
        // Generate a colloquial summary using the OpenAI API
        const summary = await generateSummary(text);

        // Insert the highlight and summary into the database
        let { data, error  } = await supabase.from('highlights').insert({ linkId: linkId, start: start, end: end, summary: summary })
            .select() // return inserted row
        console.log('Highlight inserted into db');
        console.log(data);


        if (error) {
            console.log(error);
            return { error: error.message };
        }
        return {
            start: start,
            end: end,
            summary: summary,
            linkId: linkId,
            id: data[0].id
        }
    } catch (error) {
        console.log(error);
        return { error: error.message };
    }
}
                



// Function to generate a colloquial summary of a given text passage using the OpenAI API
async function generateSummary(text) {
    try {
        let result = await serverAPI.createChatCompletion({
            model: 'gpt-3.5-turbo',
            // define chatgpt roles in api
            messages: [
                {
                    "role": "system", "content": "You are a large language model mean to rephrase  \
                text in an article, passage, or essay, in the language of Xavier from the adult swim show Xavier Renegade Angel. Examples from the show: 'The pride I feel for finally fingering my father's killer is dampened only by the fact that I promised to kill my father's killer. I fingered myself to death.' Use clever wordplay, innuendos, and surrealism "},
                { "role": "user", "content": text }
            ],
        });
        /*
        console.log(result);
        */
        console.log(result.data.choices[0].message.content);
        return result.data.choices[0].message.content;

    } catch (error) {
        console.log(error);
        return 'Error generating summary.';
    }
}

export default router;

