import * as z from 'zod';

export const Page = z.object({
	slug: z.string().min(1),
	display_name: z.string().min(1),
	markdown: z.string(),
	links: z.array(z.object({ label: z.optional(z.string()), url: z.string() }))
});

export type Page = z.infer<typeof Page>;
