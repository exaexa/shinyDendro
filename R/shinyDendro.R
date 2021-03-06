#' shinyDendro
#'
#' Create an interactive dendrogram.
#'
#' @import htmlwidgets
#'
#' @param inputId Name of the associated reactive input
#' @param cl_height,merge,order Heights, merge matrix and ordering of a dendrogram (as taken e.g. from hclust result).
#' @param heatmap Matrix with colors and named columns to display next to the dendrogram (may be updated dynamically)
#' @param assignment Initial assignment of the clusters (character vector, may be updated dynamically)
#' @param width,height,elementId Widget parameters
#'
#' @examples
#' \donttest{
#' cl <- hclust(dist(cbind(rnorm(100),rnorm(100))))
#' renderShinyDendro(shinyDendro('sdClusters', cl$height, cl$merge, cl$order))
#' }
#' @export
shinyDendro <- function(inputId,
  cl_height, merge, order,
  heatmap = NULL,
  assignment=NULL,
  fontScale = 0.66,
  fontFg = '#ffffffff',
  fontShadow = '#000000ff',
  key = NULL,
  width = NULL, height = NULL, elementId = NULL) {

  # forward options using x
  x = list(
    inputId = inputId,
    height=cl_height,
    merge=merge,
    order=order,
    fontScale=fontScale,
    fontFg=fontFg,
    fontShadow=fontShadow,
    key=key)

  if(is.vector(heatmap)) stop("heatmap must be either NULL, or a matrix/data frame!")

  if(is.null(heatmap)) {
    x$heatmapCount <- 0
  } else { #matrices and data frames
    x$heatmapCount <- dim(heatmap)[2]
    x$heatmap <- as.matrix(heatmap)
    x$heatmapNames <- colnames(heatmap)
  }

  # This is an ugly hack, but the corresponding R-easons are far more filthy.
  x$heatmapNames = c(x$heatmapNames,
      "R should not automatically flatten single-element vectors. Bad R!")

  if(!(is.null(assignment) || is.character(assignment)))
    stop("assignment must be either NULL or a character vector")

  if(!is.null(assignment)) x$assignment <- assignment

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

#' Get the key from shinyDendro output
#' @export
getShinyDendroKey <- function(output) output$key

#' Get the assignment from shinyDendro output
#' @export
getShinyDendroAssignment <- function(output) unlist(output$assignment)
