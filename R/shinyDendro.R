#' <Add Title>
#'
#' <Add Description>
#'
#' @import htmlwidgets
#'
#' @export
shinyDendro <- function(inputId, cl_height, merge, order, heatmap = NULL, width = NULL, height = NULL, elementId = NULL) {

  # forward options using x
  x = list(
    inputId = inputId,
    height=cl_height,
    merge=merge,
    order=order)

  if(!is.null(heatmap)) {
    x$heatmap <- as.matrix(heatmap)
    x$heatmapNames <- colnames(heatmap)
  }

  # create widget
  htmlwidgets::createWidget(
    name = 'shinyDendro',
    x,
    width = width,
    height = height,
    package = 'shinyDendro',
    elementId = elementId
  )
}

#' Shiny bindings for shinyDendro
#'
#' Output and render functions for using shinyDendro within Shiny
#' applications and interactive Rmd documents.
#'
#' @param outputId output variable to read from
#' @param width,height Must be a valid CSS unit (like \code{'100\%'},
#'   \code{'400px'}, \code{'auto'}) or a number, which will be coerced to a
#'   string and have \code{'px'} appended.
#' @param expr An expression that generates a shinyDendro
#' @param env The environment in which to evaluate \code{expr}.
#' @param quoted Is \code{expr} a quoted expression (with \code{quote()})? This
#'   is useful if you want to save an expression in a variable.
#'
#' @name shinyDendro-shiny
#'
#' @export
shinyDendroOutput <- function(outputId, width = '100%', height = '400px'){

  htmlwidgets::shinyWidgetOutput(outputId, 'shinyDendro', width, height, package = 'shinyDendro')
}

#' The actual HTML output function
#'
#' (we need canvas for paper.js)
#' @export
shinyDendro_html <- htmltools::tags$canvas

#' @rdname shinyDendro-shiny
#' @export
renderShinyDendro <- function(expr, env = parent.frame(), quoted = FALSE) {
  if (!quoted) { expr <- substitute(expr) } # force quoted
  htmlwidgets::shinyRenderWidget(expr, shinyDendroOutput, env, quoted = TRUE)
}
