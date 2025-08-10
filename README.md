# 🍎 Micros - Nutrition Tracking with AI Agents

A smart nutrition tracking application powered by LangGraph agents that can understand natural language queries, search for foods, log meals, and provide nutrition analysis.

## Features

- **AI-Powered Agent System**: Uses LangGraph with OpenAI or Gemini to understand user intent
- **Natural Language Processing**: Chat with the app using plain English
- **Free AI Integration**: Support for Google Gemini (free tier) and OpenAI
- **Food Search & Barcode Lookup**: Find foods by name or UPC code
- **Meal Logging**: Log meals with automatic nutrition calculation
- **Daily Summaries**: Get comprehensive nutrition reports
- **Goal Tracking**: Set and monitor nutrition goals
- **SQLite Database**: Lightweight local storage (can be upgraded to PostgreSQL)

## Quick Start

### 1. Install Dependencies

```bash
# Install Python packages
python3 -m pip install -r requirements.txt
```

### 2. Set Up Environment

```bash
# Copy environment file
cp .env.example .env

# Choose your AI provider:
# Option A: Gemini (FREE) - See GEMINI_SETUP.md
# Option B: OpenAI (PAID) - Add your OpenAI API key
# OPENAI_API_KEY=sk-your-key-here
```

### 3. Initialize Database

```bash
# Seed the database with sample data
python3 -m scripts.seed
```

### 4. Run the Application

```bash
# Set Flask app
export FLASK_APP=app.api

# Start the server
flask run
```

The API will be available at `http://127.0.0.1:5000`

## API Endpoints

### Health Check
```bash
curl http://127.0.0.1:5000/
```

### Agent Endpoint (Main)
```bash
# Search for food
curl -X POST http://127.0.0.1:5000/agent \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "search oats"}'

# Log a meal
curl -X POST http://127.0.0.1:5000/agent \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "log meal: 100g food_id=1"}'

# Get daily summary
curl -X POST http://127.0.0.1:5000/agent \
  -H "Content-Type: application/json" \
  -d '{"user_id": 1, "message": "daily summary today"}'
```

### Barcode Lookup
```bash
curl "http://127.0.0.1:5000/barcode/lookup?upc=000000000001"
```

### User Goals
```bash
# Get user goals
curl http://127.0.0.1:5000/users/1/goals

# Set user goals
curl -X PUT http://127.0.0.1:5000/users/1/goals \
  -H "Content-Type: application/json" \
  -d '{"goals": {"magnesium_mg": 400, "vitamin_k_mcg": 120}}'
```

## Agent Capabilities

The AI agent can understand and respond to various types of requests:

### Food Search
- "search for oats"
- "find spinach"
- "look up salmon"

### Meal Logging
- "log 100g of oats"
- "ate 50g spinach for breakfast"
- "logged 200g salmon for dinner"

### Daily Analysis
- "daily summary"
- "nutrition report for today"
- "how did I do today"

### Barcode Scanning
- "scan barcode 000000000001"
- "lookup UPC 000000000002"

## Project Structure

```
micros/
├── app/                    # Flask application
│   ├── __init__.py
│   ├── api.py             # Flask API endpoints
│   ├── db.py              # Database configuration
│   ├── models.py          # SQLAlchemy models
│   ├── schemas.py         # Pydantic schemas
│   ├── nutrition.py       # Nutrition calculations
│   ├── barcode.py         # Barcode utilities
│   └── food_sources/      # External data sources
│       ├── usda_loader.py
│       └── off_loader.py
├── agentic/               # LangGraph agents
│   ├── state.py           # Graph state definition
│   ├── tools.py           # Agent tools
│   ├── graph.py           # Main workflow
│   └── agents/            # Individual agents
│       ├── orchestrator.py
│       ├── barcode_agent.py
│       ├── food_search_agent.py
│       ├── logging_agent.py
│       └── analysis_agent.py
├── scripts/
│   └── seed.py            # Database seeding
├── migrations/            # Database migrations
├── tests/                 # Test files
├── run.py                 # Local runner
├── requirements.txt       # Python dependencies
├── .env.example          # Environment template
└── README.md             # This file
```

## Development

### Running Tests
```bash
# Test the agent workflow
python3 run.py
```

### Database Migrations
```bash
# Initialize Alembic (optional)
alembic init migrations

# Create migration
alembic revision --autogenerate -m "Add new table"

# Apply migrations
alembic upgrade head
```

### Adding New Food Sources
1. Create a new loader in `app/food_sources/`
2. Implement search and detail functions
3. Add integration to the appropriate agent

### Extending Agents
1. Create a new agent in `agentic/agents/`
2. Add it to the graph in `agentic/graph.py`
3. Update the orchestrator to handle new intents

## Configuration

### Environment Variables

- `FLASK_ENV`: Flask environment (development/production)
- `DATABASE_URL`: Database connection string
- `LLM_PROVIDER`: AI provider (`gemini` or `openai`)
- `GEMINI_API_KEY`: Google Gemini API key (free tier)
- `OPENAI_API_KEY`: OpenAI API key (paid)
- `EMBEDDINGS_MODEL`: Model for embeddings (optional)

### Database

The application uses SQLite by default. For production, update `DATABASE_URL` in `.env`:

```
DATABASE_URL=postgresql://user:password@localhost/micros
```

## Sample Data

The seed script creates:
- Demo user (ID: 1) with nutrition goals
- 3 sample foods: Rolled Oats, Spinach, Atlantic Salmon
- Realistic nutrition values per 100g

## TODO Features

- [ ] Image barcode scanning with pyzbar
- [ ] USDA food database integration
- [ ] Open Food Facts integration
- [ ] User authentication
- [ ] Meal planning recommendations
- [ ] Nutrition goal optimization
- [ ] Export nutrition reports
- [ ] Mobile app integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## License

MIT License - see LICENSE file for details.
