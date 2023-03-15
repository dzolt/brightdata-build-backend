import * as functions from "firebase-functions";
import { adminDb } from "./firebaseAdmin";

const fetchResults: any = async (id: string) => {
  const apiKey = process.env.NEXT_PUBLIC_BRIGHT_DATA_API_KEY;

  const res = await fetch(`https://api.brightdata.com/dca/dataset?id=${id}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
  });

  const data = await res.json();

  if (data.status === "building" || data.status === "collecting") {
    console.log("NOT READY YET >>> : %s ... trying again", data.status);
    return fetchResults(id);
  }

  return data;
};

export const onScraperComplete = functions.https.onRequest(
  async (request, response) => {
    console.log("SCRAPER COMPLETE >>> : ", request.body);

    const { success, id, finished } = request.body;

    if (!success) {
      await adminDb.collection("searches").doc(id).set(
        {
          status: "error",
          updatedAt: finished,
        },
        { merge: true }
      );
    }

    const data = await fetchResults(id);

    await adminDb.collection("searches").doc(id).set(
      {
        status: "complete",
        updatedAt: finished,
        results: data,
      },
      { merge: true }
    );

    response.send("Scraping Function Finished");
  }
);

//  https://1dc6-2a02-a317-e435-9300-d063-81c6-6f98-150b.eu.ngrok.io/brightdata-c0690/us-central1/onScraperComplete
