# API (Django + GraphQL)

## Run with Docker (recommended)

From the repo root: `docker compose up --build`. The API comes up on
`localhost:8000` with migrations applied.

## Run on your host

```bash
cd apps/api
python3.12 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env        # talks to db/minio on localhost
# Make sure infra is up: (from repo root) yarn infra:up
python manage.py migrate
python manage.py runserver 0.0.0.0:8000
```

- GraphiQL: http://localhost:8000/graphql/
- Health: http://localhost:8000/health/
- Admin: http://localhost:8000/admin/ (`python manage.py createsuperuser`)

## Layout

```
config/      Django project (settings, urls, root GraphQL schema)
core/        Domain app: Project + Image models, GraphQL types, MinIO helpers
```

## Example queries

```graphql
mutation {
  createProject(name: "Roof inspection") { project { id name } }
}

query {
  projects { id name images { id originalName downloadUrl } }
}

# Direct-to-MinIO upload: presign, PUT the file to uploadUrl, then attach.
mutation {
  createPresignedUpload(filename: "photo.jpg", contentType: "image/jpeg") {
    uploadUrl
    key
  }
}
```
