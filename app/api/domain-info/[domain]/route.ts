import { NextResponse } from "next/server"
import { getDomainKeySync, resolve } from "@bonfida/spl-name-service";
import { Connection, clusterApiUrl } from "@solana/web3.js"
import { Base58EncodedAddress } from "web3js-experimental";

type Params = {
  params: {
    domain: string
  }
}

export type DomainInfo = {
  found: false
} | {
  found: true,
  domainAddress: Base58EncodedAddress,
  ownerAddress: Base58EncodedAddress,
};

const notFound: DomainInfo = {
  found: false
}

export async function GET(_request: Request, { params: { domain } }: Params) {
  if (!domain.endsWith('.sol')) {
    return NextResponse.json(notFound);
  }

  const connection = new Connection(clusterApiUrl('mainnet-beta'));

  try {
    const ownerPublicKey = await resolve(connection, domain);
    const { pubkey: domainPublicKey } = await getDomainKeySync(domain);

    const domainInfo: DomainInfo = {
      found: true,
      domainAddress: domainPublicKey.toString(),
      ownerAddress: ownerPublicKey.toString(),
    }
    return NextResponse.json(domainInfo);
  } catch {
    // domain doesn't exist
    return NextResponse.json(notFound);
  }
}
