import { setGlobalDispatcher, EnvHttpProxyAgent } from 'undici';
import { client_login } from './lib/discord_bot';
import { ProxyAgent } from 'proxy-agent';
import https from 'https';
import http from 'http';

// Configure global http proxy if proxy environment variables are set.
if (process.env['HTTP_PROXY'] || process.env['HTTPS_PROXY'] || process.env['NO_PROXY']) {
	const agent = new ProxyAgent();
	https.globalAgent = agent;
	http.globalAgent = agent;
	setGlobalDispatcher(new EnvHttpProxyAgent());
}

await client_login();
