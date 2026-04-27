const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "movies.json");

function readMovies() {
  const data = fs.readFileSync(DATA_FILE, "utf-8");
  return JSON.parse(data);
}

function writeMovies(movies) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(movies, null, 2));
}

function sendJSON(res, statusCode, data) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
  });
}

function getAllMovies(req, res) {
  const movies = readMovies();
  sendJSON(res, 200, movies);
}

function getMovieById(req, res, id) {
  const movies = readMovies();
  const movie = movies.find((m) => m.id === id);
  if (!movie) return sendJSON(res, 404, { error: "Movie not found" });
  sendJSON(res, 200, movie);
}

async function createMovie(req, res) {
  try {
    const body = await parseBody(req);
    const { title, director, year, genre, review, rating } = body;

    if (!title || !director || !year) {
      return sendJSON(res, 400, {
        error: "title, director, and year are required",
      });
    }

    if (rating !== undefined && (rating < 1 || rating > 10)) {
      return sendJSON(res, 400, { error: "rating must be between 1 and 10" });
    }

    const movies = readMovies();
    const newMovie = {
      id: Date.now().toString(),
      title,
      director,
      year,
      genre: genre || null,
      review: review || null,
      rating: rating || null,
      createdAt: new Date().toISOString(),
    };

    movies.push(newMovie);
    writeMovies(movies);
    sendJSON(res, 201, newMovie);
  } catch (err) {
    sendJSON(res, 400, { error: err.message });
  }
}

// PUT /movies/:id — update a movie
async function updateMovie(req, res, id) {
  try {
    const body = await parseBody(req);
    const movies = readMovies();
    const index = movies.findIndex((m) => m.id === id);

    if (index === -1) return sendJSON(res, 404, { error: "Movie not found" });

    if (body.rating !== undefined && (body.rating < 1 || body.rating > 10)) {
      return sendJSON(res, 400, { error: "rating must be between 1 and 10" });
    }

    movies[index] = {
      ...movies[index],
      ...body,
      id: movies[index].id,
      updatedAt: new Date().toISOString(),
    };

    writeMovies(movies);
    sendJSON(res, 200, movies[index]);
  } catch (err) {
    sendJSON(res, 400, { error: err.message });
  }
}

// DELETE /movies/:id — delete a movie
function deleteMovie(req, res, id) {
  const movies = readMovies();
  const index = movies.findIndex((m) => m.id === id);

  if (index === -1) return sendJSON(res, 404, { error: "Movie not found" });

  const deleted = movies.splice(index, 1)[0];
  writeMovies(movies);
  sendJSON(res, 200, { message: "Movie deleted", movie: deleted });
}

const server = http.createServer((req, res) => {
  const { method, url } = req;
  const cleanUrl = url.split("?")[0];

  if (cleanUrl === "/movies") {
    if (method === "GET") return getAllMovies(req, res);
    if (method === "POST") return createMovie(req, res);
  }

  const movieWithId = cleanUrl.match(/^\/movies\/([^/]+)$/);
  if (movieWithId) {
    const id = movieWithId[1];
    if (method === "GET") return getMovieById(req, res, id);
    if (method === "PUT") return updateMovie(req, res, id);
    if (method === "DELETE") return deleteMovie(req, res, id);
  }
  sendJSON(res, 404, { error: "Route not found" });
});

server.listen(PORT, () => {
  console.log(`Movie Review API running at http://localhost:${PORT}`);
  console.log(`
Available routes:
  GET    /movies          - Get all movies
  POST   /movies          - Create a movie
  GET    /movies/:id      - Get a movie by ID
  PUT    /movies/:id      - Update a movie by ID
  DELETE /movies/:id      - Delete a movie by ID
  `);
});
