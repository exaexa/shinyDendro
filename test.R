#!/usr/bin/R -f
devtools::install()

set.seed(1)
d <- iris[,1:4]
e <- prcomp(d)$x[,1:2]
clust <- hclust(dist(d, method='manhattan'))

scaleCols <- function(x) apply(x, 2, function(col)(col-min(col))/(max(col)-min(col)))
colorizeCols <- function(x) apply(scaleCols(x),2,function(col) viridisLite::viridis(100)[1+99*col])
setNAs <- function(x) {
  x[x==' ']<-NA
  x
}

library(shiny)
library(shinyDendro)

ui <- fluidPage(
  titlePanel("shinyDendro test"),
  selectInput('sdDisplayCols', label="Columns to display",
    choices=colnames(d), multiple=TRUE, width='20em'),
  textInput("sdFocusTest", "Focus test", value="aaa"),
  fluidRow(
  column(4,shinyDendroOutput('sdTest', width='30em', height='30em')),
  column(4,plotOutput('sdPlot', width='30em', height='30em'))
  )
)

server <- function(input, output) {
  output$sdTest <- renderShinyDendro({
    colors <- colorizeCols(d)[,input$sdDisplayCols,drop=F]
    shinyDendro(
      'sdClusters',
      clust$height,
      clust$merge,
      clust$order,
      colors,
      assignment=c("a"," ","b","c"),
      fontScale=.66,
      fontFg='#ffffffff',
      fontShadow='#000000ff',
      key="someKey"
    )
  })
  output$sdPlot <- renderPlot(
    if(!is.null(input$sdClusters)) {
      par(mar=c(0,0,0,0))
      EmbedSOM::PlotEmbed(e, alpha=.3, pch=19, xaxt='n', yaxt='n',
                          clust=setNAs(unlist(input$sdClusters$assignment)))
    } else NULL
  )
}

shinyApp(ui, server, options=list(port=8888))

