
// @ts-nocheck
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import AgoraToken from 'npm:agora-token@2.0.2';

const APP_ID          = Deno.env.get('3388d08d4d7b4e40801241ffee5c3752')          ?? '';
const APP_CERTIFICATE = Deno.env.get('313ebfd839d24db59d891f21d0ec6c90') ?? '';

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS });

  const { channelName, uid = 0 } = await req.json();
  if (!channelName) return new Response(JSON.stringify({ error: 'channelName required' }), { status: 400 });

  // No certificate → testing mode (disable token auth in Agora console)
  if (!APP_CERTIFICATE) {
    return new Response(JSON.stringify({ token: '' }), { headers: { 'Content-Type': 'application/json', ...CORS } });
  }

  const expireTs = Math.floor(Date.now() / 1000) + 3600;
  const token = AgoraToken.RtcTokenBuilder.buildTokenWithUid(
    APP_ID, APP_CERTIFICATE, channelName, uid,
    AgoraToken.RtcRole.PUBLISHER, expireTs, expireTs,
  );

  return new Response(JSON.stringify({ token }), {
    headers: { 'Content-Type': 'application/json', ...CORS },
  });
});