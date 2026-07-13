import prisma from "../lib/prisma.js";

/**
 * Calcular similitud entre dos strings usando Levenshtein distance
 */
function calculateSimilarity(str1, str2) {
  const len1 = str1.length;
  const len2 = str2.length;
  
  if (len1 === 0) return len2 === 0 ? 1 : 0;
  if (len2 === 0) return 0;
  
  const matrix = [];
  
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }
  
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  
  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  
  return 1 - (distance / maxLen);
}

/**
 * Normalizar texto para comparación
 */
function normalizeText(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .replace(/[^\w\s]/g, "") // Remove special characters
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
}

/**
 * Buscar tickets similares a un nuevo ticket
 */
export async function findSimilarTickets(subject, description, threshold = 0.7) {
  const normalizedSubject = normalizeText(subject);
  const normalizedDescription = normalizeText(description);
  const combinedText = `${normalizedSubject} ${normalizedDescription}`;
  
  // Buscar tickets recientes (últimos 30 días)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const recentTickets = await prisma.supportTicket.findMany({
    where: {
      createdAt: { gte: thirtyDaysAgo },
      status: { in: ["OPEN", "IN_PROGRESS"] }
    },
    select: {
      id: true,
      subject: true,
      description: true,
      userId: true,
      createdAt: true
    }
  });
  
  const similarTickets = [];
  
  for (const ticket of recentTickets) {
    const ticketSubject = normalizeText(ticket.subject);
    const ticketDescription = normalizeText(ticket.description);
    const ticketCombined = `${ticketSubject} ${ticketDescription}`;
    
    const similarity = calculateSimilarity(combinedText, ticketCombined);
    
    if (similarity >= threshold) {
      similarTickets.push({
        ticketId: ticket.id,
        subject: ticket.subject,
        description: ticket.description,
        userId: ticket.userId,
        similarity: similarity,
        createdAt: ticket.createdAt
      });
    }
  }
  
  // Ordenar por similitud descendente
  similarTickets.sort((a, b) => b.similarity - a.similarity);
  
  return similarTickets;
}

/**
 * Agrupar tickets similares
 */
export async function groupSimilarTickets(tickets) {
  const groups = [];
  const processed = new Set();
  
  for (const ticket of tickets) {
    if (processed.has(ticket.ticketId)) continue;
    
    const group = [ticket];
    processed.add(ticket.ticketId);
    
    // Buscar tickets similares a este
    for (const otherTicket of tickets) {
      if (processed.has(otherTicket.ticketId)) continue;
      
      const similarity = calculateSimilarity(
        normalizeText(`${ticket.subject} ${ticket.description}`),
        normalizeText(`${otherTicket.subject} ${otherTicket.description}`)
      );
      
      if (similarity >= 0.7) {
        group.push(otherTicket);
        processed.add(otherTicket.ticketId);
      }
    }
    
    if (group.length > 1) {
      groups.push(group);
    }
  }
  
  return groups;
}

/**
 * Buscar artículos de ayuda similares a una pregunta
 */
export async function findSimilarHelpArticles(question, threshold = 0.6) {
  const normalizedQuestion = normalizeText(question);
  
  const articles = await prisma.helpArticle.findMany({
    select: {
      id: true,
      question: true,
      answer: true,
      category: true,
      keywords: true
    }
  });
  
  const similarArticles = [];
  
  for (const article of articles) {
    const articleQuestion = normalizeText(article.question);
    const articleKeywords = article.keywords ? normalizeText(article.keywords) : "";
    const articleCombined = `${articleQuestion} ${articleKeywords}`;
    
    const similarity = calculateSimilarity(normalizedQuestion, articleCombined);
    
    if (similarity >= threshold) {
      similarArticles.push({
        articleId: article.id,
        question: article.question,
        answer: article.answer,
        category: article.category,
        similarity: similarity
      });
    }
  }
  
  // Ordenar por similitud descendente
  similarArticles.sort((a, b) => b.similarity - a.similarity);
  
  return similarArticles;
}

/**
 * Crear artículo de ayuda desde respuesta de ticket
 */
export async function createHelpArticleFromTicket(ticketId, answer, category, keywords = null, createdBy) {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id: ticketId },
    select: {
      subject: true,
      description: true
    }
  });
  
  if (!ticket) {
    throw new Error("Ticket no encontrado");
  }
  
  const article = await prisma.helpArticle.create({
    data: {
      question: ticket.subject,
      answer: answer,
      category: category,
      keywords: keywords,
      createdBy: createdBy,
      relatedTickets: [ticketId]
    }
  });
  
  return article;
}

export default {
  calculateSimilarity,
  normalizeText,
  findSimilarTickets,
  groupSimilarTickets,
  findSimilarHelpArticles,
  createHelpArticleFromTicket
};
