import { z } from "zod";
import { BathroomLockValues, type CafeInput, LocationValues } from "../../types/index.ts";

const coordinatesSchema = z.object({
  lat: z.number().gte(-90).lte(90),
  lng: z.number().gte(-180).lte(180),
});

const wifiSchema = z.object({
  available: z.boolean(),
  name: z.string().max(255),
  password: z.string().max(255),
  fast: z.boolean(),
});

const bathroomSchema = z.object({
  available: z.boolean(),
  clean: z.boolean(),
  locked: z.enum(BathroomLockValues).nullish(),
});

const busySchema = z.object({
  morning: z.boolean(),
  afternoon: z.boolean(),
  evening: z.boolean(),
});

export const cafeBodySchema = z.object({
  address: z.string().trim().min(1).max(500),
  name: z.string().trim().min(1).max(255),
  type: z.enum(LocationValues),
  coordinates: coordinatesSchema,
  wifi: wifiSchema,
  outlet: z.boolean(),
  bathroom: bathroomSchema,
  seating: z.boolean(),
  clean: z.boolean(),
  busy: busySchema,
  parking: z.boolean(),
});

export const updateCafeBodySchema = z
  .object({
    address: cafeBodySchema.shape.address,
    name: cafeBodySchema.shape.name,
    type: cafeBodySchema.shape.type,
    coordinates: coordinatesSchema,
    wifi: wifiSchema.partial(),
    outlet: z.boolean(),
    bathroom: bathroomSchema.partial(),
    seating: z.boolean(),
    clean: z.boolean(),
    busy: busySchema.partial(),
    parking: z.boolean(),
  })
  .partial()
  .refine((value) => Object.keys(value).length > 0, { message: "Empty update" });

export const publicIdSchema = z.string().uuid();

export const saveCafeBodySchema = cafeBodySchema.extend({
  publicId: publicIdSchema.optional(),
});

export const listCafesQuerySchema = z
  .object({
    lat: z.coerce.number().gte(-90).lte(90).optional(),
    lng: z.coerce.number().gte(-180).lte(180).optional(),
    radiusMeters: z.coerce.number().gt(0).max(50_000).optional(),
    submitted: z
      .enum(["true", "false"])
      .optional()
      .transform((value) => (value === undefined ? undefined : value === "true")),
  })
  .refine((query) => (query.lat === undefined) === (query.lng === undefined), {
    message: "lat and lng are both required",
  });

export type CafeUpdate = z.infer<typeof updateCafeBodySchema>;

export const invalidCafeMessage = (error: z.ZodError) => {
  const issue = error.issues[0];
  const path = issue?.path.join(".");
  return path ? `Invalid cafe: ${path}` : "Invalid cafe";
};

export const toCafeInput = (value: z.infer<typeof cafeBodySchema>): CafeInput => ({
  ...value,
  bathroom: {
    ...value.bathroom,
    locked: value.bathroom.locked ?? undefined,
  },
});
