export class Condorcet {
    constructor(contestants_input, results, linkA, previewA, linkB, previewB )
    {
        // construction parameters
        this.contestants_input = contestants_input; // <input type="file" multiple>
        this.results = results;                     // <pre>
        this.linkA = linkA;                         // <a id="optionA">
        this.previewA = previewA;                   // <div id="previewA">
        this.linkB = linkB;                         // <a id="optionB">
        this.previewB = previewB;                   // <div id="previewB">

        // internal holding structures
        this.contestants = new Array();             // Array<Array<File,int>>
        this.urlObjectA = "A";                      // string : urlObject blob string
        this.urlObjectB = "B";                      // string : urlObject blob string
        this.numRounds = 0;

        // static executive configuration
        this.iframeTypes = ["text/plain", "application/pdf", "application/json"];
    }

    /**
     * Consume the files from the <input type="file" multiple>
     */
    ingest()
    {
        // convert the input into a dictionary of contestants
        this.contestants = Array.from(this.contestants_input.files).map(file => ({file, score: 0}));

        this.numRounds = 0;

        this.displayResults();

        if(Object.keys(this.contestants).length >= 2)
        {
            this.makeMatchup();
        }
    }

    /**
     * Fallback function definition.
     * 
     * This should never be called and should be overwritten by Condorcet.makeMatchup()
     */
    optionA()
    {
        console.error("Condorcet.optionA() was called in its default non-init state, aborting!");
        console.trace();
    }

    /**
     * Fallback function definition.
     * 
     * This should never be called and should be overwritten by Condorcet.makeMatchup()
     */
    optionB()
    {
        console.error("Condorcet.optionB() was called in its default non-init state, aborting!");
        console.trace();
    }

    /**
     * Pick two random contestants and generate a new round for that selection
     * 
     * Previews are updated to reflect the choices via this.renderPreview().
     * This function updates the definition of `this.optionA()` and `this.optionB()` to reference the new selection
     */
    makeMatchup()
    {
        let optionA;
        let optionB;

        // pick two random options (numerical indices)
        while(optionA === optionB)
        {
            let keys = Object.keys(this.contestants);
            optionA = keys[Math.floor(Math.random() * keys.length)];
            optionB = keys[Math.floor(Math.random() * keys.length)]; 
        }
        
        // update optionA's display and code
        this.linkA.innerText = this.contestants[optionA].file.name; // update the main voting <a>s to have proper code
        this.renderPreview( // update the main voting previews to have proper content
            this.previewA,
            this.contestants[optionA].file,
            this.urlObjectA
        );
        this.optionA = function() // update the voting function to reflect its new payload
        {
            this.contestants[optionA].score++;
            this.numRounds++;
            this.makeMatchup();
            this.displayResults();
        }

        // update optionB's display and code
        this.linkB.innerText = this.contestants[optionB].file.name; // update the main voting <a>s to have proper code
        this.renderPreview( // update the main voting previews to have proper content
            this.previewB,
            this.contestants[optionB].file,
            this.urlObjectB
        );
        this.optionB = function() // update the voting function to reflect its new payload
        {
            this.contestants[optionB].score++;
            this.numRounds++;
            this.makeMatchup();
            this.displayResults();
        }
    }

    /**
     * update the "results" <pre> with JSON text describing the current standings
     */
    displayResults()
    {
        const sorted = [...this.contestants]
            .sort((a, b) => b.score - a.score)
            .map(c => `"${c.file.name}",${c.score}`);

        this.results.innerText =
            `Rounds: ${this.numRounds}\n\n\n` +
            sorted.join("\n");
    };

    /**
     * insert the provided data into the preview <divs>
     * 
     * If file.type is of a known type, it is previewed as a specific HTML element
     * If file.type is unknown, it is previewed as a <pre> with the file name  
     * 
     * @param {HTMLDivElement} previewEl - the div that the preview will need to be inserted into
     * @param {File} file - the provided file that will be previewed by creating a temporary URL object to
     * @param {string} oldUrlRefName - the name of the associated object url element that will be overwritten
     */
    renderPreview(previewEl, file, urlObject)
    {
        // before clearing the urlObject, determine if we are operating on this.urlObjectA or this.urlObjectB
        let whatUrlObject = "";
        urlObject == this.urlObjectA ? whatUrlObject = "A" : void(1);
        urlObject == this.urlObjectB ? whatUrlObject = "B" : void(1);

        // revoke old blob URL if present
        if (urlObject) {
            if(urlObject.pause)
            {
                urlObject.pause();
            }
            console.debug("Revoking urlObject:", urlObject);
            URL.revokeObjectURL(urlObject);
        }

        // create a new urlObject and additionally save it to this.urlObjectA / this.urlObjectB based on the destination determined earlier
        urlObject = URL.createObjectURL(file);
        whatUrlObject == "A" ? this.urlObjectA = urlObject : void(1);
        whatUrlObject == "B" ? this.urlObjectB = urlObject : void(1);
        console.debug("Created urlObject:", urlObject);

        // clear preview
        previewEl.innerHTML = "";

        let el;

        // infer type from file MIME
        if (file.type.startsWith("audio/")) {
            // audios into audio
            el = document.createElement("audio");
            el.controls = true;
            el.autoplay = false;
            el.src = urlObject;
            el.style.width = "100%";

        } else if (file.type.startsWith("video/")) {
            // videos into video
            el = document.createElement("video");
            el.controls = true;
            el.autoplay = false;
            el.src = urlObject;
            el.style.width = "100%";
            el.style.height = "50vh";

        } else if (file.type.startsWith("image/")) {
            // images into img
            el = document.createElement("img");
            el.src = urlObject;
            el.style.width = "100%";
            el.style.height = "50vh";
            el.style.objectFit = "contain";

        } else if (this.iframeTypes.includes(file.type)) {
            // iframes for documents
            el = document.createElement("iframe");
            el.src = urlObject;
            el.style.width = "100%";
            el.style.height = "50vh";
            el.style.objectFit = "contain";

        
        } else {
            // FALLBACK → pre
            el = document.createElement("pre");
            el.innerText = file.name;
            el.style.width = "100%";
            el.style.height = "50vh";
            el.style.border = "none";
            el.title = "File preview";
        }

        previewEl.appendChild(el);
    };
}