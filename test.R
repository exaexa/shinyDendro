#!/usr/bin/R -f
devtools::install()

set.seed(1)
d <- iris[,1:4]
e <- prcomp(d)$x[,1:2]
#clust <- hclust(dist(d, method='manhattan'), method='average')
clust <- mhca::mhclust(d)

library(shiny)
library(shinyDendro)

ui <- fluidPage(
  titlePanel("shinyDendro test"),
  fluidRow(
  column(6,shinyDendroOutput('sdTest', width='40em', height='40em')),
  column(6,plotOutput('sdPlot', width='40em', height='40em'))
  )
)

server <- function(input, output) {
  output$sdTest <- renderShinyDendro(
    shinyDendro(
      'sdClusters',
      clust$height,
      clust$merge,
      clust$order
    )
  )
  output$sdPlot <- renderPlot(
    if(!is.null(input$sdClusters))
      EmbedSOM::PlotEmbed(e, pch=19, clust=as.numeric(factor(input$sdClusters)))
    else NULL
  )
}

shinyApp(ui, server, options=list(port=8888))

