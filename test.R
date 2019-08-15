#!/usr/bin/R -f
devtools::install()

set.seed(1)
d <- as.matrix(data.frame(v1=rnorm(100),v2=rnorm(100)))
clust <- hclust(dist(d, method='manhattan'), method='average')

library(shiny)
library(shinyDendro)

ui <- fluidPage(
  titlePanel("shinyDendro test"),
  shinyDendroOutput('sdTest', width='30em', height='30em'),
  plotOutput('sdPlot', width='30em', height='30em')
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
      EmbedSOM::PlotEmbed(d, clust=as.numeric(factor(input$sdClusters)))
    else NULL
  )
}

shinyApp(ui, server, options=list(port=8888))

