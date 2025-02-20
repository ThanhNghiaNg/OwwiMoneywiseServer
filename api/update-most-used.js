
export function GET(request) {
    console.log("from cron job: ", request);
    return new Response('Hello from Vercel!');
}