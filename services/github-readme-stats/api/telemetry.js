// @ts-check

import { renderTelemetryCard } from "../src/cards/telemetry.js";
import { guardAccess } from "../src/common/access.js";
import {
  CACHE_TTL,
  resolveCacheSeconds,
  setCacheHeaders,
  setErrorCacheHeaders,
} from "../src/common/cache.js";
import {
  MissingParamError,
  retrieveSecondaryMessage,
} from "../src/common/error.js";
import { parseArray, parseBoolean } from "../src/common/ops.js";
import { renderError } from "../src/common/render.js";
import { fetchStats } from "../src/fetchers/stats.js";
import { fetchTopLanguages } from "../src/fetchers/top-languages.js";

// @ts-ignore
export default async (req, res) => {
  const {
    username,
    theme,
    cache_seconds,
    hide_border,
    border_radius,
    border_color,
    bg_color,
    title_color,
    text_color,
    icon_color,
    include_all_commits,
    commits_year,
    exclude_repo,
    langs_count,
    size_weight,
    count_weight,
    disable_animations,
    card_width,
    card_height,
    card_style,
  } = req.query;

  res.setHeader("Content-Type", "image/svg+xml");

  const toInt = (v) => {
    if (typeof v !== "string") return undefined;
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : undefined;
  };

  const access = guardAccess({
    res,
    id: username,
    type: "username",
    colors: {
      title_color,
      text_color,
      bg_color,
      border_color,
      theme,
    },
  });
  if (!access.isPassed) {
    return access.result;
  }

  try {
    const stats = await fetchStats(
      username,
      parseBoolean(include_all_commits),
      parseArray(exclude_repo),
      false,
      false,
      false,
      toInt(commits_year),
    );

    const langs = await fetchTopLanguages(
      username,
      parseArray(exclude_repo),
      typeof size_weight === "string" ? parseFloat(size_weight) : 1,
      typeof count_weight === "string" ? parseFloat(count_weight) : 0,
    );

    const cacheSeconds = resolveCacheSeconds({
      requested: parseInt(cache_seconds, 10),
      def: CACHE_TTL.STATS_CARD.DEFAULT,
      min: CACHE_TTL.STATS_CARD.MIN,
      max: CACHE_TTL.STATS_CARD.MAX,
    });

    setCacheHeaders(res, cacheSeconds);

    return res.send(
      renderTelemetryCard(stats, langs, {
        title_color,
        text_color,
        icon_color,
        bg_color,
        border_color,
        theme,
        card_style,
        card_width: toInt(card_width),
        card_height: toInt(card_height),
        border_radius: toInt(border_radius),
        hide_border: parseBoolean(hide_border),
        disable_animations: parseBoolean(disable_animations),
        langs_count: toInt(langs_count),
      }),
    );
  } catch (err) {
    setErrorCacheHeaders(res);
    if (err instanceof Error) {
      return res.send(
        renderError({
          message: err.message,
          secondaryMessage: retrieveSecondaryMessage(err),
          renderOptions: {
            title_color,
            text_color,
            bg_color,
            border_color,
            theme,
            show_repo_link: !(err instanceof MissingParamError),
          },
        }),
      );
    }
    return res.send(
      renderError({
        message: "An unknown error occurred",
        renderOptions: {
          title_color,
          text_color,
          bg_color,
          border_color,
          theme,
        },
      }),
    );
  }
};
