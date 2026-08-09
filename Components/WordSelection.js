// NOTE: This is not component and is just a simple function that fetches some words and returns it.

export default async function WordSelection() {
    const wordsChoices = [];
    async function getWords() {
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        let response = await fetch(`${baseUrl}/wordlist_cleaned.json`);
        response = await response.json();
        console.log(response);
        return response[Math.floor(Math.random() * response.length)]['word'];
    }

    while (wordsChoices.length < 5) {
        let word = await getWords();
        if (!wordsChoices.includes(word)) {
            wordsChoices.push(word);
        }
    }

    return wordsChoices;
}
