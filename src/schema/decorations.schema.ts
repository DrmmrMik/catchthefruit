import { z } from 'zod';

export const DecorationSlotTypeSchema = z.enum([
  'centerpiece',
  'gate',
  'banners',
  'garden',
  'throne',
  'seating',
  'wall',
  'table',
  'rug'
]);
export type DecorationSlotType = z.infer<typeof DecorationSlotTypeSchema>;

export const DecorationCategorySchema = z.enum(['outside', 'inside']);
export type DecorationCategory = z.infer<typeof DecorationCategorySchema>;

export const DecorationItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: DecorationCategorySchema,
  slotType: DecorationSlotTypeSchema,
  price: z.number().int().min(0),
  icon: z.string().min(1),
  description: z.string().min(1)
});
export type DecorationItem = z.infer<typeof DecorationItemSchema>;

export const DecorationCatalogSchema = z.object({
  version: z.number().int().default(1),
  items: z.array(DecorationItemSchema).min(1)
});
export type DecorationCatalog = z.infer<typeof DecorationCatalogSchema>;
