<script>
    let highlights = [];
    let essayDiv;
    let summary = "";

    async function showSummary(text) {
        // Get the summary for the highlighted text using the OpenAI API
        const response = await fetch("api/highlight", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                text: text,
                highlights: highlights,
            }),
        });
        const responseData = await response.json();
        summary = responseData.data;
    }

    function hideSummary() {
        summary = "";
    }

    async function handleMouseUp() {
        const selection = window.getSelection();

        if (!selection.isCollapsed) {
            // Get the selected text and its position
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();
            const startOffset = range.startOffset;
            const endOffset = range.endOffset;

            // call api/highlight with input text
            const req = {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    text: selectedText,
                    start: startOffset,
                    end: endOffset,
                    url: url
                }),
            };

            const resp = await fetch("api/highlight", req)
            const response = await resp.json()

            console.log(response)

            // Save the highlighted text and its position to the highlights array
            highlights.push({
                text: selectedText,
                startOffset: startOffset,
                endOffset: endOffset,
                summary: response.data
            });

            // dumb hack to force svelte to update the highlights array
            highlights = [...highlights];
        }
    }


    let url = "";
    let essayData = "";

    // Function to handle form submission
    async function handleSubmit(event) {
        // Prevent form from posting
        event.preventDefault();

        // Get the link from the input field
        url = event.target.elements.url.value;

        // Send link to the server for processing
        const response = await fetch("api/link", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                url: url,
            }),
        });

        const responseData = await response.json();
        console.log(responseData)

        // Check for errors
        if (responseData.error) {
            console.log(responseData.error);
            return;
        }

        // Assign processed data to the text variable
        essayData = responseData.data;
        highlights = responseData.highlights;
    }
</script>

<!-- Import tailwind css -->
<link rel="stylesheet" href="./global.css" />
<!-- Add a container to keep the content centered -->
<div class="container mx-auto">
    <!-- Add header to show user what the web app is about -->
    <h1 class="text-4xl text-center text-primary font-bold mb-6">
        Link to Essay Web App
    </h1>
    <!-- Add form to get input from the user -->
    <form on:submit|preventDefault={handleSubmit}>
        <input
            type="text"
            name="url"
            class="w-full py-4 px-4 rounded-t-lg border border-gray-300
        focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent"
            placeholder="Enter your link"
        />
        <button
            type="submit"
            class="bg-blue-500 text-white font-bold py-2 px-4 rounded-b-lg focus:outline-none focus:shadow-outline hover:bg-blue-600"
        >
            Process
        </button>
    </form>
    <!-- Add a div to display the processed text content -->
    {#if essayData}
        <div bind:this={essayDiv} class="essayDiv" on:mouseup={handleMouseUp}>
                <p
                    class={ "bg-primary text-text"}
                >
                    {essayData}
                </p>
        </div>
        {#each highlights as highlight}
            <span
                class="highlight"
                style="text-decoration: underline; background-color: yellow; cursor: pointer;"
                on:mouseenter={() => {
                    console.log("him here", highlight.text);
                    showSummary(highlight.text)
                }}
                on:mouseleave={() => hideSummary()}
            >
                {highlight.text}
            </span>
        {/each}
        <div
            class="summary"
            style="position: fixed; bottom: 0; left: 0; right: 0; background-color: white; padding: 1em; border-top: 1px solid gray; display: {summary
                ? 'block'
                : 'none'};"
        >
            {summary}
        </div>
    {/if}
</div>
