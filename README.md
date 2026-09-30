# teawork-be

Installation reminders

- `npm install <package>`: `pnpm add <package>`
- `npm install --save-dev <package>`: `pnpm add -D <package>`

Cleaning up migrations

- Find the old .sql file (s) in `./drizzle` and copy name (s)
- In Terminal run `shasum -a 256 <file-path>`
- Remove the corresponding entry in `__drizzle_migrations` (in the database)
- Remove the .sql file (s)
- Remove the entries in `./drizzle/meta/_journal.json`

## Scripts

- `pnpm dev` — API on port **8001**, using `.env.development`
- `pnpm type-check`
- `pnpm lint`
- `pnpm db-generate` — write a migration from `src/db/schemas`
- `pnpm db-migrate-dev` — apply migrations to the dev database
- `pnpm db-studio-dev` — Drizzle Studio on port **8002**

Running Postgres with Docker locally

- ```
  docker desktop start
  docker run --name teawork-db -e POSTGRES_USER=teaworkadmin -e POSTGRES_PASSWORD=teaworkpassword -e POSTGRES_DB=teawork_db -p 5432:5432 -d postgres
  docker ps -a
  docker start teawork-db
  docker exec -it teawork-db bash
  psql -U teaworkadmin -d teawork_db
  ```

    - URL to connect to: `postgres://teaworkadmin:teaworkpassword@localhost:5432/teawork_db`
    - `--name teawork-db`: Container name (kebab-case, env-scoped — mirrors AWS RDS identifier convention)
    - `-e POSTGRES_USER=teaworkadmin`: Db master username (no hyphens/underscores — mirrors AWS RDS master username
      rules)
    - `-e POSTGRES_PASSWORD=teaworkpassword`: Replace with a strong password (avoid `@`, `/`, `?` — safe for connection
      strings)
    - `-e POSTGRES_DB=teawork_db`: Database name (snake_case, env-scoped — PostgreSQL identifiers cannot contain
      hyphens)
    - `-p 5432:5432`: Exposes PostgreSQL on port 5432
    - `-d postgres`: Runs the official PostgreSQL image in the background

- Drop and recreate DB: log into separate database (`postgres`) to modify/delete main database (`teawork_db`)
    - `-U`: user
    - `-d`: database name

```
psql -U teaworkadmin -d postgres
```

- Inside psql:
    - `\l`: view all databases
    - `\du`: view all users
    - Note: don't drop `postgres`, `template0`, or `template1` databases
    - Sometimes might need to enter postgres db to delete other db: `\c postgres`

```postgresql
DROP DATABASE your_database_name;
CREATE DATABASE your_database_name;
DROP USER user;
```

## Auth

- Google OAuth code exchange: `POST /user/login/google`
- Access + refresh JWTs (Jose), refresh rows in `refresh_tokens`
- Cookie names from `ACCESS_TOKEN_KEY` / `REFRESH_TOKEN_KEY` (must match teawork-fe)
- `GOOGLE_REDIRECT_URIS` must be the frontend callback: `http://localhost:8000/api/login/google`
- `TEAWORK_URL` — frontend base URL for redirects (dev: `http://localhost:8000`)

Copy `.env.example` to `.env.development` and fill secrets (`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, Google client,
etc.).

## Cafes

A cafe is one shared place: the map pin plus the notes in `CafeType`. Any signed-in user can read it. `POST /cafes`
creates the row when that place is new, and updates the existing row when it is not. A place matches the nearest cafe
within 50 meters with the same name, or the only cafe at that address within 50 meters. Send `publicId` to update that
cafe directly. `PATCH /cafes/:publicId` updates part of the record, such as the wifi password, busy times, or bathroom
lock.

`user_favorite_cafes` is still per user. The person who created a cafe can soft-delete it.

The pin’s coordinates are the `coordinates` the client sends. The API does not place a cafe from an IP address.

| Method   | Path                        | Action                                                                          |
|----------|-----------------------------|---------------------------------------------------------------------------------|
| `POST`   | `/cafes`                    | Create, or update the matching cafe                                             |
| `GET`    | `/cafes`                    | List cafes. Optional `lat`, `lng`, and `radiusMeters` (default 5000, max 50000). `submitted=true` keeps places this user created or updated |
| `GET`    | `/cafes/favorites`          | Cafes the user has starred                                                      |
| `GET`    | `/cafes/:publicId`          | One cafe                                                                        |
| `PATCH`  | `/cafes/:publicId`          | Update any cafe                                                                 |
| `DELETE` | `/cafes/:publicId`          | Creator soft-deletes the cafe                                                   |
| `POST`   | `/cafes/:publicId/favorite` | Star                                                                            |
| `DELETE` | `/cafes/:publicId/favorite` | Unstar                                                                          |

All of these sit behind the same access-token check as `/geo`. Apply `drizzle/0001_cafes.sql` and
`drizzle/0002_public_cafes.sql` with `pnpm db-migrate-dev`.

## Geolocation

Center the map with the browser Geolocation API. It is free and uses the device, so it is much closer than a city-level
IP lookup. Call `POST /geo` only when the user denies location or the browser has no position.

`POST /geo` looks up the visitor IP Express exposes after `TRUST_PROXY`. It does not call ipinfo with an empty address,
which would locate the API container. Set `TRUST_PROXY=1` when one reverse proxy sits in front of the API. Localhost has
no public client IP; in development you can still pass `{ "ip": "<public ip>" }` to exercise the fallback.

Restart container/local database

```
docker container ls -a
docker container start teawork-db
```

- Close container

```
docker stop <container_id_or_name>
```