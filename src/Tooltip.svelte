<script>
    export let message = ""; // Tooltip message content
    export let visible = false; // Whether the tooltip is visible
    export let x = 0; // X-coordinate of cursor
    export let y = 0; // Y-coordinate of cursor
    export let color = "#FFD700"; // Default color

    let tooltipContainer;
    $: {
        if (tooltipContainer) {
            // Calculate the available space on the right side of the cursor
            const availableSpace = window.innerWidth - x;

            // Calculate the maximum width for the tooltip based on the available space
            const maxWidth = availableSpace - 20; // Subtract 20px for padding

            // Apply the calculated max-width and position to the tooltip container
            tooltipContainer.style.maxWidth = `${maxWidth}px`;
            tooltipContainer.style.left = `${x + 50}px`;
            tooltipContainer.style.top = `${y + 50}px`;
            tooltipContainer.style.display = visible ? "block" : "none";
        }
    }
</script>

<!-- Tooltip container with absolute positioning -->
<div
    bind:this={tooltipContainer}
    class="tooltip-container fixed bg-white text-gray-700 rounded shadow-lg p-5 z-10 border-2 border-black"
    style="background-color: {color};  left: {x}px; top: {y}px; display: {visible
        ? 'block'
        : 'none'};"
>
    <!-- Image container with absolute positioning -->
    <div
        class="image-container absolute top-0 left-0 transform -translate-x-3/4 -translate-y-1/2"
    >
        <img src="xra.png" alt="XRA" width="80" height="80" />
    </div>
    {message}
</div>

<style>
    /* Additional styles for the tooltip */
    .tooltip-container {
        transform: translateX(-50%);
        transition: all 0.2s ease-in-out;
    }
    /* Additional styles for the image container */
    .image-container {
        z-index: 1; /* Set the z-index to make sure the image container is on top */
    }
</style>
