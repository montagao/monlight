<script>
    import Tooltip from "./Tooltip.svelte";

    let darkMode = false;

    // function to toggle dark mode
    function toggleDarkMode() {
        darkMode = !darkMode;
        if (darkMode) {
            document.body.classList.add("dark");
        } else {
            document.body.classList.remove("dark");
        }
    }

    let highlights = [];
    let summary = "";
    let combined = [];
    let isLoading = false;
    let essayDiv;

    // highlighting fun
    let highlightColor;
    const highlightColors = [
        "rgba(235, 87, 87, 0.5)", // rose
        "rgba(111, 60, 96, 0.5)", // pine
        "rgba(188, 121, 119, 0.5)", // another color in the rose-pine scheme
    ];

    // A function to get the color for a specific highlight based on its index
    function getHighlightColor(index) {
        return highlightColors[index % highlightColors.length];
    }

    // mapping between highlightId -> summary

    async function showSummary(event, id, highlightIndex) {
        if (!id) {
            console.log("no id");
            return;
        }
        // Get the summary for the highlighted text using the OpenAI API
        // find the highlight matching the text and set summary to equal highlight.summary
        const highlight = highlights.find((h) => h.id === id);
        highlightColor = getHighlightColor(highlightIndex);

        summary = highlight.summary;
        showTooltip(event, summary);
    }

    function hideSummary() {
        summary = "";
        hideTooltip();
    }

    async function handleMouseUp() {
        const selection = window.getSelection();

        if (!selection.isCollapsed) {
            const range = selection.getRangeAt(0);
            const selectedText = range.toString();

            // Calculate the correct startOffset and endOffset relative to the entire essayData
            let startOffset = range.startOffset;
            let currentNode = range.startContainer;
            while (currentNode && currentNode !== essayDiv) {
                if (currentNode.previousSibling) {
                    currentNode = currentNode.previousSibling;
                    startOffset += currentNode.textContent.length;
                } else {
                    currentNode = currentNode.parentNode;
                }
            }

            const endOffset = startOffset + selectedText.length;

            console.log("range", range);
            console.log("selected text", selectedText);
            console.log("start offset", startOffset);
            console.log("end offset", endOffset);

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
                    url: url,
                }),
            };

            isLoading = true;

            const resp = await fetch("api/highlight", req);
            const response = await resp.json();

            console.log(response);
            console.log(response.data);

            // Save the highlighted text and its position to the highlights array
            highlights.push({
                start: startOffset,
                end: endOffset,
                summary: response.data.summary,
                id: response.data.id,
                linkId: response.data.linkId,
            });

            updateCombined();
            // dumb hack to force svelte to update the highlights array
            highlights = [...highlights];
            isLoading = false;
        }
    }

    let url = "";
    let essayData = "";

    // Function to handle form submission
    async function handleSubmit(event) {
        // hide tooltip
        hideTooltip();
        // Prevent form from postin
        event.preventDefault();

        // Get the link from the input field
        url = event.target.elements.url.value;

        isLoading = true;

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
        console.log("got response", responseData);

        // Check for errors
        if (responseData.error) {
            console.log(responseData.error);
            return;
        }

        // Assign processed data to the text variable
        essayData = responseData.data;
        highlights = responseData.highlights;
        combined = [];
        updateCombined();
        isLoading = false;
    }

    function updateCombined() {
        // Sort highlights by start position
        const sortedHighlights = highlights.sort((a, b) => a.start - b.start);

        // Merge overlapping highlights
        const mergedHighlights = [];
        let currentHighlight = null;

        console.log("sorted highlights", sortedHighlights);

        sortedHighlights.forEach((highlight) => {
            if (currentHighlight && highlight.start <= currentHighlight.end) {
                // Overlapping, update the current highlight's end position and concatenate summaries
                currentHighlight.end = Math.max(
                    currentHighlight.end,
                    highlight.end
                );
                currentHighlight.summary += "; " + highlight.summary;
            } else {
                // Not overlapping, push the current highlight and set the new highlight as current
                if (currentHighlight) {
                    mergedHighlights.push(currentHighlight);
                }
                currentHighlight = { ...highlight };
            }
        });
        // Push the last highlight
        if (currentHighlight) {
            mergedHighlights.push(currentHighlight);
        }

        console.log("merged highlights", mergedHighlights);

        // Create segments based on merged highlights
        combined = [];
        let currentIndex = 0;
        mergedHighlights.forEach((highlight) => {
            combined.push({
                text: essayData.slice(currentIndex, highlight.start),
                isHighlight: false,
            });
            combined.push({
                text: essayData.slice(highlight.start, highlight.end),
                isHighlight: true,
                id: highlight.id,
                summary: highlight.summary,
            });
            currentIndex = highlight.end;
        });

        // Append any remaining text after the last highlight
        if (currentIndex < essayData.length) {
            combined.push({
                text: essayData.slice(currentIndex),
                isHighlight: false,
            });
        }

        return combined;
    }

    let tooltipMessage = ""; // Message to display in the tooltip
    let tooltipVisible = false; // Whether the tooltip is visible
    let tooltipX = 0; // X-coordinate of the tooltip
    let tooltipY = 0; // Y-coordinate of the tooltip

    // Function to show the tooltip
    function showTooltip(event, text) {
        tooltipMessage = text;
        tooltipVisible = true;
        tooltipX = event.clientX;
        tooltipY = event.clientY;
    }

    // Function to hide the tooltip
    function hideTooltip() {
        tooltipVisible = false;
    }
</script>

<!-- Import tailwind css -->
<link rel="stylesheet" href="./global.css" />
<!-- Add a container to keep the content centered -->
<div class="container mx-auto px-4 py-8 mb-80">
    <!-- Add a button to toggle dark mode -->
    <button
        on:click={toggleDarkMode}
        class="bg-black-500 text-white font-bold py-2 px-4 border border-gray-300 rounded focus:outline-none focus:shadow-outline hover:bg-blue-600"
    >
        {darkMode ? "🌞" : "🌝"}
    </button>
    <!-- Add header to show user what the web app is about -->
    <h1 class="text-4xl text-center text-primary font-bold mb-6">Frittata!</h1>
    <!-- Brief description of the web app -->
    <p class="text-center text-gray-500 mb-6">
        Highlight some text to translate anything to Xavier-speak
    </p>
    <!-- Add form to get input from the user -->
    <form on:submit|preventDefault={handleSubmit}>
        <input
            type="text"
            name="url"
            class="w-full py-4 px-4 rounded-lg border border-gray-300
        focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-black"
            placeholder="Enter your link"

        />
        <div class="flex justify-center py-5">
            <button
                type="submit"
                class="align-middle bg-gradient-to-r from-blue-500 to-purple-500 text-white font-bold py-2 px-4 rounded-full focus:outline-none focus:shadow-outline hover:shadow-lg transition-all duration-200 ease-in-out transform hover:scale-105"
            >
                Cerebal Enlightment Initiator
            </button>
        </div>
    </form>
    <!-- Add a div to display the loading indicator -->
    {#if isLoading}
        <div class="flex py-5 justify-center items-center">
            <div
                class="animate-spin h-10 w-10 border-blue-500"
            >
                <img alt='fritatta!' src="xra.svg" />
            </div>
            <span class="ml-2 text-blue-500">Pondering cosmic implications...</span>
        </div>
    {/if}
    <!-- Add a div to display the processed text content -->
    {#if essayData}
        <div class="bg-white rounded-lg shadow-md p-8">
            <div
                bind:this={essayDiv}
                class="essayDiv prose max-w-none"
                on:mouseup={handleMouseUp}
            >
                {#each combined as segment, index}
                    {#if segment.isHighlight}
                        <span
                            class="segment-wrapper py-8"
                            on:mouseenter={() => {
                                console.log(
                                    "showing summary for highlighted text",
                                    segment.text,
                                    "with id",
                                    segment.id
                                );
                                showSummary(event, segment.id, index);
                            }}
                            on:mouseleave={() => hideSummary()}
                            style="
                            background-color: {getHighlightColor(
                                index
                            )}; padding: 2px 0px; border-radius: 4px; cursor: pointer;"
                        >
                            <span class="highlight">
                                {segment.text}
                            </span>
                        </span>
                    {:else}
                        {segment.text}
                    {/if}
                {/each}
            </div>
        </div>
        <!-- Tooltip to display the summary -->
        <Tooltip
            bind:visible={tooltipVisible}
            bind:message={tooltipMessage}
            bind:x={tooltipX}
            bind:y={tooltipY}
        />
    {/if}
</div>

