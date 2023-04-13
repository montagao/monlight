// Import required libraries
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// Function to get and display processed text content for a given link
export async function getText(id) {
    try {
        // Query the database for the parsed content associated with the ID
        const { data, error } = await supabase.from('links').select('content').eq('id', id);

        // Check for errors
        if (error) {
            return { error: error.message };
        }

        // Return the parsed content
        return { data: data[0].content };
    } catch (error) {
        console.log(error);
        return {
                    error: error.message };
    }
}

// Function to create a highlight and generate a summary for a selected text passage
export async function createHighlight(linkId, start, end) {
    try {
        // Query the database for the text content associated with the ID
        const { data, error } = await supabase.from('links').select().eq('id', linkId);

        // Check for errors
        if (error) {
            return { error: error.message };
        }

        // Extract the selected text passage
        const text = data[0].content.slice(start, end);

        // Generate a colloquial summary using the OpenAI API
        const summary = await generateSummary(text);

        // Insert the highlight and summary into the database
        const { error: highlightError } = await supabase.from('highlights').insert({ text_id: linkId, position: { start, end }, summary });

        // Check for errors
        if (highlightError) {
            return { error: highlightError.message };
        }

        return { data: summary };
    } catch (error) {
        console.log(error);
        return { error: error.message };
    }
}

// Function to generate a colloquial summary of a given text passage using the OpenAI API
export async function generateSummary(text) {
    try {
        // Create a message array for the OpenAI API
        const messages = [
            { role: 'system', content: 'You are a helpful assistant.' },
            { role: 'user', content: text },
            { role: 'assistant', content: '' }
        ];

        // Send the message array to the OpenAI API and return the summary
        const response = await axios.post('https://api.openai.com/v1/chat', {
            prompt: messages,
            model: 'text-davinci-002',
            max_tokens: 50,
            temperature: 0.7,
            n: 1,
            stop: 'User:'
        }, {
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        return response.data.choices[0].text;
    } catch (error) {
        console.log(error);
        return 'Error generating summary.';
    }
}

