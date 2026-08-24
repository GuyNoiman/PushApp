/** The Mirror tool's entry point — one factory, one inert fallback, as the other pillars do it. */
import { NullMirrorGateway, type MirrorGateway } from './MirrorGateway';
import { SupabaseMirrorGateway } from './SupabaseMirrorGateway';

export * from './MirrorGateway';
export * from './round';
export * from './questionBank';

let gateway: MirrorGateway | null = null;

export function getMirrorGateway(): MirrorGateway {
  if (!gateway) {
    const supabaseGateway = new SupabaseMirrorGateway();
    gateway = supabaseGateway.enabled ? supabaseGateway : NullMirrorGateway;
  }
  return gateway;
}
