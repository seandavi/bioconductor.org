import { shards, urlset } from '../lib/sitemap.js';

export const getStaticPaths = async () =>
  Object.entries(await shards()).map(([shard, urls]) => ({ params: { shard }, props: { urls } }));

export const GET = ({ props }) => new Response(urlset(props.urls), { headers: { 'Content-Type': 'application/xml' } });
