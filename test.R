#!/usr/bin/R -f
devtools::install()

set.seed(1)
d <- iris[,1:4]
e <- prcomp(d)$x[,1:2]

scaleCols <- function(x) apply(x, 2, function(col)(col-min(col))/(max(col)-min(col)))

library(shiny)
library(shinyDendro)

ui <- fluidPage(
  titlePanel("shinyDendro test"),
  fluidRow(
  column(6,shinyDendroOutput('sdTest', width='50em', height='50em')),
  column(6,plotOutput('sdPlot', width='50em', height='50em'))
  )
)

server <- function(input, output) {
  output$sdTest <- renderShinyDendro(
    shinyDendro(
      'sdClusters',
      sqrt(clust$height),
      clust$merge,
      clust$order,
      scaleCols(d)
    )
  )
  output$sdPlot <- renderPlot(
    if(!is.null(input$sdClusters))
      EmbedSOM::PlotEmbed(e, alpha=.3, pch=19, clust=as.numeric(factor(input$sdClusters)))
    else NULL
  )
}

shinyApp(ui, server, options=list(port=8888))

