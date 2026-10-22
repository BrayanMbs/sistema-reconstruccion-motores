import type { Request, Response } from "express";
import { SearchRepository } from "../repositories/search.repository";
import { sanitizeSearchQuery } from "../validators/common.validators";

const repository = new SearchRepository();

export const globalSearch = async (request: Request, response: Response): Promise<void> => {
  const rawTerm = request.query.q ?? request.query.query ?? request.query.search;
  const term = sanitizeSearchQuery(rawTerm);

  if (!term || term.trim().length < 2) {
    response.json({
      query: term ?? "",
      results: {
        orders: [],
        clients: [],
        users: [],
        inventory: []
      }
    });
    return;
  }

  const results = await repository.search(term.trim());
  response.json({
    query: term.trim(),
    results
  });
};

